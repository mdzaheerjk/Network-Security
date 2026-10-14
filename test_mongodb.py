import os
from dotenv import load_dotenv
from pymongo.mongo_client import MongoClient
import certifi

load_dotenv()
ca=certifi.where()

uri=os.getenv("MONGO_DB_URL") or os.getenv("MONGODB_URL_KEY") or ""
if uri.strip():
    client=MongoClient(uri, tlsCAFile=ca)
    try:
        client.admin.command('ping')
        print("Pinged your deployment. You Successfully connected to MongoDB!")
    except Exception as e:
        print(e)
else:
    print("MONGO_DB_URL is not set in environment or .env file.")