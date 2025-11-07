from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import psycopg2, json
from psycopg2.extras import RealDictCursor
import os

app = FastAPI()

# Mount static files (CSS, JS)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Allow frontend access (from browser)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection string
DB_URL = "postgresql://neondb_owner:npg_O0LrfcY7oGZN@ep-silent-rain-a19bkdss-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

# Function to get database connection
def get_db_connection():
    try:
        conn = psycopg2.connect(DB_URL, cursor_factory=RealDictCursor)
        return conn
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        raise HTTPException(500, f"Database connection failed: {str(e)}")

# Serve HTML pages
@app.get("/")
def home():
    return FileResponse('templates/home.html')

@app.get("/index.html")
def index():
    return FileResponse('templates/index.html')

@app.get("/register.html")
def register_page():
    return FileResponse('templates/register.html')

@app.get("/order.html")
def order_page():
    return FileResponse('templates/order.html')

@app.get("/orders.html")
def orders_page():
    return FileResponse('templates/orders.html')

@app.get("/profile.html")
def profile_page():
    return FileResponse('templates/profile.html')

@app.get("/admin.html")
def admin_page():
    return FileResponse('templates/admin.html')

@app.get("/adminmenu.html")
def adminmenu_page():
    return FileResponse('templates/adminmenu.html')

@app.get("/home.html")
def home_page():
    return FileResponse('templates/home.html')

# Health check endpoint
@app.get("/health")
def health_check():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1")
        conn.close()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}

# --- Register User ---
@app.post("/register")
def register(data: dict):
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM users WHERE email=%s", (data["email"],))
        if cur.fetchone():
            raise HTTPException(400, "Email already registered")
        cur.execute("INSERT INTO users(name,email,password,role) VALUES(%s,%s,%s,'user')",
                    (data["name"], data["email"], data["password"]))
        conn.commit()
        return {"ok": True, "message": "User registered successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Registration error: {e}")
        raise HTTPException(500, f"Registration failed: {str(e)}")
    finally:
        conn.close()

# --- Login ---
@app.post("/login")
def login(data: dict):
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE email=%s AND password=%s",
                    (data["email"], data["password"]))
        user = cur.fetchone()
        if not user:
            raise HTTPException(400, "Invalid credentials")
        return user  # includes "role"
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Login error: {e}")
        raise HTTPException(500, f"Login failed: {str(e)}")
    finally:
        conn.close()

# --- Place Order ---
@app.post("/orders")
def place_order(data: dict):
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO orders(user_id,fullname,contact,location,items,total)
            VALUES (%s,%s,%s,%s,%s,%s)
            RETURNING *;
        """, (data["user_id"], data["fullname"], data["contact"],
              data["location"], json.dumps(data["items"]), data["total"]))
        conn.commit()
        return {"ok": True, "message": "Order placed successfully"}
    except Exception as e:
        print(f"❌ Order placement error: {e}")
        raise HTTPException(500, f"Order placement failed: {str(e)}")
    finally:
        conn.close()

# --- Admin: View Orders ---
@app.get("/orders")
def get_orders():
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM orders ORDER BY id DESC")
        result = cur.fetchall()
        return result
    except Exception as e:
        print(f"❌ Get orders error: {e}")
        raise HTTPException(500, f"Failed to get orders: {str(e)}")
    finally:
        conn.close()

# --- Admin: Update Order Status ---
@app.put("/orders/{oid}")
def update_order(oid: int, data: dict):
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("UPDATE orders SET status=%s WHERE id=%s RETURNING *",
                    (data["status"], oid))
        conn.commit()
        result = cur.fetchone()
        return result
    except Exception as e:
        print(f"❌ Update order error: {e}")
        raise HTTPException(500, f"Failed to update order: {str(e)}")
    finally:
        conn.close()

@app.on_event("startup")
async def startup_event():
    print("=" * 60)
    print("🚀 RMLCanteen Server Starting...")
    print("=" * 60)
    print("📡 Testing database connection...")
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Test 1: Check if users table exists
        print("📋 Checking tables...")
        cur.execute("SELECT COUNT(*) as count FROM users")
        user_count = cur.fetchone()
        print(f"✅ Users table exists! Found {user_count['count']} users.")
        
        # Test 2: Check if orders table exists
        cur.execute("SELECT COUNT(*) as count FROM orders")
        order_count = cur.fetchone()
        print(f"✅ Orders table exists! Found {order_count['count']} orders.")
        
        # Test 3: Show some users (without passwords)
        cur.execute("SELECT id, name, email, role FROM users LIMIT 3")
        users = cur.fetchall()
        if users:
            print("\n👥 Sample users:")
            for user in users:
                print(f"   - {user['name']} ({user['email']}) - Role: {user['role']}")
        
        conn.close()
        print("\n" + "=" * 60)
        print("✅ DATABASE IS WORKING PERFECTLY!")
        print("=" * 60)
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        print("⚠️  Server will start but database features won't work!")
        print("\n💡 Possible solutions:")
        print("   1. Check your internet connection")
        print("   2. Verify NeonDB database is active")
        print("   3. Check if connection string is correct")
        print("=" * 60)
    print("\n🌐 Server: http://localhost:8000")
    print("📄 Docs: http://localhost:8000/docs")
    print("=" * 60)
