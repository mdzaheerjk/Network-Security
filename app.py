import sys
import os
import certifi
ca=certifi.where()

from dotenv import load_dotenv
load_dotenv()
mongo_db_url=os.getenv('MONGODB_URL_KEY') or os.getenv('MONGO_DB_URL')
print(mongo_db_url)
import pymongo
from networksecurity.exception.exception import NetworkSecurityException
from networksecurity.logging.logger import logging
from networksecurity.pipeline.training_pipeline import TrainingPipeline

from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI,File,UploadFile,Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response, FileResponse, JSONResponse
from uvicorn import run as app_run
from starlette.responses import RedirectResponse
import pandas as pd
from networksecurity.utils.main_utils.utils import load_object
from networksecurity.utils.ml_utils.model.estimator import NetworkModel

from networksecurity.constant.training_pipeline import (
    DATA_INGESTION_COLLECTION_NAME,
    DATA_INGESTION_DATABASE_NAME,
    TARGET_COLUMN
)

if mongo_db_url:
    client=pymongo.MongoClient(mongo_db_url,tlsCAFile=ca)
    database=client[DATA_INGESTION_DATABASE_NAME]
    collection=database[DATA_INGESTION_COLLECTION_NAME]
else:
    client=None
    database=None
    collection=None

app=FastAPI(title="ShieldNet AI", description="Network Security & Phishing Detector")
origins=['*']
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*']
)

if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

from fastapi.templating import Jinja2Templates
template_dir = 'template' if os.path.exists('template') else 'templates'
templates=Jinja2Templates(directory=template_dir)

@app.get("/")
async def index(request: Request):
    return templates.TemplateResponse(request=request, name="index.html")

@app.get("/sample-csv")
async def sample_csv():
    sample_path = os.path.join("valid_data", "sample_prediction.csv")
    if not os.path.exists(sample_path):
        raw_csv = os.path.join("Network_Data", "phisingData.csv")
        if os.path.exists(raw_csv):
            df = pd.read_csv(raw_csv).head(15)
            if TARGET_COLUMN in df.columns:
                df = df.drop(columns=[TARGET_COLUMN])
            os.makedirs("valid_data", exist_ok=True)
            df.to_csv(sample_path, index=False)
    return FileResponse(path=sample_path, filename="sample_network_data.csv", media_type="text/csv")

@app.post("/predict-single")
async def predict_single_route(request: Request):
    try:
        data = await request.json()
        df = pd.DataFrame([data])
        
        preprocessor_path = "final_model/preprocessor.pkl"
        model_path = "final_model/model.pkl"
        
        if not os.path.exists(preprocessor_path) or not os.path.exists(model_path):
            return JSONResponse(
                status_code=400,
                content={"error": "Model files not found. Please train the model first by visiting /train."}
            )
        
        preprocessor = load_object(preprocessor_path)
        final_model = load_object(model_path)
        network_model = NetworkModel(preprocessor=preprocessor, model=final_model)
        
        if hasattr(preprocessor, "feature_names_in_"):
            expected_cols = list(preprocessor.feature_names_in_)
            if all(col in df.columns for col in expected_cols):
                predict_df = df[expected_cols]
            else:
                predict_df = df.drop(columns=[TARGET_COLUMN], errors='ignore')
        else:
            predict_df = df.drop(columns=[TARGET_COLUMN], errors='ignore')
            
        y_pred = network_model.predict(predict_df)
        pred_val = int(y_pred[0])
        is_safe = (pred_val == 1)
        
        return JSONResponse(content={
            "success": True,
            "prediction": pred_val,
            "verdict": "Legitimate / Safe" if is_safe else "Phishing Threat",
            "is_safe": is_safe,
            "message": "URL heuristics verified safe." if is_safe else "High risk phishing markers detected."
        })
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/train")
async def train_route():
    try:
        train_pipeline=TrainingPipeline()
        train_pipeline.run_pipeline()
        return Response("Training is successful")
    except Exception as e:
        raise NetworkSecurityException(e,sys)

@app.post("/predict")
async def predict_route(request:Request,file:UploadFile=File(...)):
    try:
        df=pd.read_csv(file.file)
        
        preprocessor_path = "final_model/preprocessor.pkl"
        model_path = "final_model/model.pkl"
        
        if not os.path.exists(preprocessor_path) or not os.path.exists(model_path):
            err_msg = "Model files not found. Please train the model first by visiting /train."
            if request.headers.get("x-requested-with") == "XMLHttpRequest" or "application/json" in request.headers.get("accept", ""):
                return JSONResponse(status_code=400, content={"error": err_msg})
            raise Exception(err_msg)
        
        preprocessor=load_object(preprocessor_path)
        final_model=load_object(model_path)
        network_model=NetworkModel(preprocessor=preprocessor,model=final_model)
        
        if hasattr(preprocessor, "feature_names_in_"):
            expected_cols = list(preprocessor.feature_names_in_)
            if all(col in df.columns for col in expected_cols):
                predict_df = df[expected_cols]
            else:
                predict_df = df.drop(columns=[TARGET_COLUMN], errors='ignore')
        else:
            predict_df = df.drop(columns=[TARGET_COLUMN], errors='ignore')
            
        y_pred=network_model.predict(predict_df)
        df['predicted_column']=y_pred
        
        total_records = len(df)
        phishing_count = int((df['predicted_column'] <= 0).sum())
        safe_count = int((df['predicted_column'] == 1).sum())
        phishing_percent = round((phishing_count / total_records) * 100, 1) if total_records > 0 else 0
        
        os.makedirs('prediction_output', exist_ok=True)
        df.to_csv('prediction_output/output.csv', index=False)
        
        # Check if client expects JSON (AJAX request from web UI)
        if request.headers.get("x-requested-with") == "XMLHttpRequest" or "application/json" in request.headers.get("accept", ""):
            return JSONResponse(content={
                "success": True,
                "metrics": {
                    "total": total_records,
                    "phishing": phishing_count,
                    "safe": safe_count,
                    "phishing_percent": phishing_percent
                },
                "rows": df.to_dict(orient="records"),
                "columns": list(df.columns)
            })
            
        table_html=df.to_html(classes='table table-striped', index=False)
        return templates.TemplateResponse(request=request, name='table.html', context={'table':table_html})
    except Exception as e:
        if request.headers.get("x-requested-with") == "XMLHttpRequest" or "application/json" in request.headers.get("accept", ""):
            return JSONResponse(status_code=500, content={"error": str(e)})
        raise NetworkSecurityException(e,sys)

if __name__=="__main__":
    app_run(app,host='0.0.0.0',port=8000)
    