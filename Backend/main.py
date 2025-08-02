from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Welcome to the FastAPI application!"}


@app.get("/graph/{item_id}")
def read_item(item_id: int):
    return {"message": f"Welcome to the FastAPI application! You requested item {item_id}."}
