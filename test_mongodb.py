from pymongo.mongo_client import MongoClient

uri=" "
client=MongoClient(uri)

try:
    client.admin.command('ping')
    print("Pinged your deployment. You Successfully connected to MongoDB!")
except Exception as e:
    print(e)