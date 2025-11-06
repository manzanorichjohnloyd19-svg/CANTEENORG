from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import psycopg2, json
from psycopg2.extras import RealDictCursor

app = FastAPI()

# Allow frontend access (from browser)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🟢 Replace with your NeonDB connection string
conn = psycopg2.connect(
    "postgresql://neondb_owner:npg_O0LrfcY7oGZN@ep-silent-rain-a19bkdss-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
    cursor_factory=RealDictCursor
)

@app.get("/")
def root():
    return {"message": "RMLCanteen API running locally"}

# --- Register User ---
@app.post("/register")
def register(data: dict):
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM users WHERE email=%s", (data["email"],))
    if cur.fetchone():
        raise HTTPException(400, "Email already registered")
    cur.execute("INSERT INTO users(name,email,password,role) VALUES(%s,%s,%s,'user')",
                (data["name"], data["email"], data["password"]))
    conn.commit()
    return {"ok": True}

# --- Login ---
@app.post("/login")
def login(data: dict):
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE email=%s AND password=%s",
                (data["email"], data["password"]))
    user = cur.fetchone()
    if not user:
        raise HTTPException(400, "Invalid credentials")
    return user  # includes "role"

# --- Place Order ---
@app.post("/orders")
def place_order(data: dict):
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO orders(user_id,fullname,contact,location,items,total)
        VALUES (%s,%s,%s,%s,%s,%s)
        RETURNING *;
    """, (data["user_id"], data["fullname"], data["contact"],
          data["location"], json.dumps(data["items"]), data["total"]))
    conn.commit()
    return {"ok": True}

# --- Admin: View Orders ---
@app.get("/orders")
def get_orders():
    cur = conn.cursor()
    cur.execute("SELECT * FROM orders ORDER BY id DESC")
    return cur.fetchall()

# --- Admin: Update Order Status ---
@app.put("/orders/{oid}")
def update_order(oid: int, data: dict):
    cur = conn.cursor()
    cur.execute("UPDATE orders SET status=%s WHERE id=%s RETURNING *",
                (data["status"], oid))
    conn.commit()
    return cur.fetchone()
