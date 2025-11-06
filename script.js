/* ===== CanteenOS — unified script.js (FINAL) =====
   - keys: canteen_users_v2, canteen_current_v2, canteen_cart_v2, canteen_orders_v2
   - delivery fee: 10
   - admin demo account: admin@canteen / admin123
*/

/* ---------- Storage helpers ---------- */
const KEY_USERS = 'canteen_users_v2';
const KEY_CURRENT = 'canteen_current_v2';
const KEY_CART = 'canteen_cart_v2';
const KEY_ORDERS = 'canteen_orders_v2';
const KEY_SOLDOUT = 'canteen_soldout_v1';
const DELIVERY_FEE = 10;

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch(e){ return fallback; }
}
function write(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

/* ---------- Boot defaults ---------- */
(function initDefaults(){
  if(!localStorage.getItem(KEY_USERS)){
    // admin + one demo user
    write(KEY_USERS, [
      { id: 'admin', name: 'Administrator', email: 'admin@canteen', pass: 'admin123', role: 'admin' },
      { id: 'u1', name: 'Test User', email: 'user@demo', pass: 'user123', role: 'user' }
    ]);
  }
  if(!localStorage.getItem(KEY_ORDERS)) write(KEY_ORDERS, []);
  if(!localStorage.getItem(KEY_CART)) write(KEY_CART, []);
  if(!localStorage.getItem(KEY_SOLDOUT)) write(KEY_SOLDOUT, []); // init soldout list
})();

/* ---------- Auth: register, login, logout ---------- */
function getUsers(){ return read(KEY_USERS, []); }
function saveUsers(users){ write(KEY_USERS, users); }

function getCurrent(){ return read(KEY_CURRENT, null); }
function saveCurrent(u){ write(KEY_CURRENT, u); }
function clearCurrent(){ localStorage.removeItem(KEY_CURRENT); }

function registerUser(){
  const name = (document.getElementById('regName')?.value || '').trim();
  const email = (document.getElementById('regEmail')?.value || '').trim().toLowerCase();
  const pass = (document.getElementById('regPass')?.value || '').trim();

  if(!name || !email || pass.length < 4) return alert('Please fill fields. Password min 4 chars.');
  const users = getUsers();
  if(users.some(u => u.email === email)) return alert('Email already registered.');
  const id = 'u' + Date.now();
  users.push({ id, name, email, pass, role: 'user' });
  saveUsers(users);
  alert('Account created. You can now login.');
  location.href = 'index.html';
}

function loginUser(){
  const email = (document.getElementById('loginEmail')?.value || '').trim().toLowerCase();
  const pass = (document.getElementById('loginPass')?.value || '').trim();
  if(!email || !pass) return alert('Enter email and password.');

  const users = getUsers();
  const user = users.find(u => u.email === email && u.pass === pass);
  if(!user) return alert('Invalid credentials.');

  saveCurrent({ id: user.id, name: user.name, email: user.email, role: user.role });
  if(user.role === 'admin') location.href = 'admin.html';
  else location.href = 'order.html';
}

function logoutUser(){
  clearCurrent();
  location.href = 'index.html';
}

/* ---------- Menu data (4 budget, 8 foods, 6 drinks) ---------- */
const DEFAULT_MENU = {
  budget: [
    { id: 's1', name: 'Budget Meal A (Fried Chicken + Rice)', price: 50 },
    { id: 's2', name: 'Budget Meal B (Pork Adobo + Rice)', price: 50 },
    { id: 's3', name: 'Budget Meal C (Burger Steak + Rice)', price: 50 },
    { id: 's4', name: 'Budget Meal D (Hotdog + Egg + Rice)', price: 45 }
  ],
  foods: [
    { id: 'f1', name: 'Sisig', price: 70 },
    { id: 'f2', name: 'Dinakdakan', price: 75 },
    { id: 'f3', name: 'Pork Adobo', price: 65 },
    { id: 'f4', name: 'Beef Caldereta', price: 80 },
    { id: 'f5', name: 'Carbonara', price: 70 },
    { id: 'f6', name: 'Spaghetti', price: 60 },
    { id: 'f7', name: 'Palabok', price: 60 },
    { id: 'f8', name: 'Fried Rice', price: 20 }
  ],
  drinks: [
    { id: 'd1', name: 'Coke', price: 25 },
    { id: 'd2', name: 'Sprite', price: 25 },
    { id: 'd3', name: 'Royal', price: 25 },
    { id: 'd4', name: 'Bottled Water', price: 15 },
    { id: 'd5', name: 'C2 Green Tea', price: 20 },
    { id: 'd6', name: 'Iced Coffee', price: 35 }
  ]
};

/* ---------- Sold Out Management ---------- */
function getSoldOutItems() {
  return read(KEY_SOLDOUT, []);
}
function saveSoldOutItems(list) {
  write(KEY_SOLDOUT, list);
}
function toggleSoldOut(itemId) {
  let soldOut = getSoldOutItems();
  if (soldOut.includes(itemId)) {
    soldOut = soldOut.filter(id => id !== itemId);
  } else {
    soldOut.push(itemId);
  }
  saveSoldOutItems(soldOut);
  // inform admin UI and try updating order page UI if present
  renderAdminMenuList();
  // If order.html open in same tab, re-render menu there
  if(typeof loadMenuToPage === 'function') loadMenuToPage();
  alert('✅ Item availability updated.');
}

/* ---------- Cart functions ---------- */
function getCart(){ return read(KEY_CART, []); }
function saveCart(c){ write(KEY_CART, c); }
function clearCart(){ saveCart([]); renderCart(); }

function addToCartById(id, qty = 1){
  // find item in menu
  const menu = {...DEFAULT_MENU};
  const all = [...menu.budget, ...menu.foods, ...menu.drinks];
  const item = all.find(x => x.id === id);
  const soldOut = getSoldOutItems();
  if(!item) return alert('Item not found.');
  if(soldOut.includes(id)) return alert('Sorry — this item is sold out.');
  const cart = getCart();
  const row = cart.find(r => r.id === id);
  if(row) row.qty += qty;
  else cart.push({ id: item.id, name: item.name, price: item.price, qty });
  saveCart(cart);
  renderCart();
}

// helper (used in order.html simpler add buttons)
function addToCart(name, price, qty = 1){
  const cart = getCart();
  // use timestamp-based id for items added via simpler addToCart(name,price)
  const id = 'x' + Math.random().toString(36).slice(2,9);
  cart.push({ id, name, price, qty });
  saveCart(cart);
  renderCart();
}

function updateCartQty(id, newQty){
  let cart = getCart();
  if(newQty <= 0) cart = cart.filter(x => x.id !== id);
  else cart = cart.map(x => x.id === id ? {...x, qty: Number(newQty)} : x);
  saveCart(cart);
  renderCart();
}

function removeCartItem(id){
  if(!confirm('Remove item from cart?')) return;
  const cart = getCart().filter(x => x.id !== id);
  saveCart(cart);
  renderCart();
}

function calcSubtotal(){
  const cart = getCart();
  return cart.reduce((s, it) => s + (Number(it.price) * Number(it.qty || 1)), 0);
}

/* ---------- Render cart UI ---------- */
function renderCart(){
  const listEl = document.getElementById('cartList');
  if(!listEl) return;
  const cart = getCart();
  if(cart.length === 0){
    listEl.innerHTML = '<div class="muted">Cart is empty</div>';
  } else {
    listEl.innerHTML = cart.map(it => `
      <div class="cart-item">
        <div>
          <strong>${it.name}</strong><br>
          <span class="muted">₱${Number(it.price).toFixed(2)} × ${it.qty}</span>
        </div>
        <div>
          <button class="btn small" onclick="promptEditQty('${it.id}', ${it.qty})">Edit</button>
          <button class="btn small ghost" onclick="removeCartItem('${it.id}')">Delete</button>
        </div>
      </div>
    `).join('');
  }
  // totals
  const subtotal = calcSubtotal();
  const grand = subtotal + DELIVERY_FEE;
  const sEl = document.getElementById('subtotal');
  const gEl = document.getElementById('grandTotal') || document.getElementById('total') || null;
  if(sEl) sEl.innerText = subtotal.toFixed(2);
  if(gEl) gEl.innerText = grand.toFixed(2);
}

/* small prompt edit */
function promptEditQty(id, currentQty){
  const val = prompt('Enter new quantity:', currentQty);
  if(val === null) return;
  const n = Number(val);
  if(isNaN(n) || n <= 0) return alert('Invalid quantity');
  updateCartQty(id, n);
}

/* ---------- Menu rendering for order.html ---------- */
function loadMenuToPage(){
  const budget = document.getElementById('budgetContainer');
  const foods = document.getElementById('foodsContainer');
  const drinks = document.getElementById('drinksContainer');
  if(budget) budget.innerHTML = DEFAULT_MENU.budget.map(i => itemCardHtml(i)).join('');
  if(foods) foods.innerHTML = DEFAULT_MENU.foods.map(i => itemCardHtml(i)).join('');
  if(drinks) drinks.innerHTML = DEFAULT_MENU.drinks.map(i => itemCardHtml(i)).join('');
}

function itemCardHtml(i){
  const soldOut = getSoldOutItems();
  const isSold = soldOut.includes(i.id);
  return `
    <div class="item card ${isSold ? 'sold' : ''}">
      <div>
        <h4 style="margin:0 0 6px 0;">${i.name}</h4>
        <div class="muted">₱${Number(i.price).toFixed(2)}</div>
      </div>
      <div style="margin-top:8px;">
        ${isSold ? `<div class="sold-label">SOLD OUT</div>` : `
          <div style="display:flex;gap:8px;align-items:center;justify-content:center;">
            <input class="qty" type="number" id="q_${i.id}" value="1" min="1">
            <button class="btn small" onclick="addToCartWithQty('${i.id}')">Add</button>
          </div>
        `}
      </div>
    </div>
  `;
}

function addToCartWithQty(id){
  const qEl = document.getElementById('q_' + id);
  const qty = qEl ? Number(qEl.value) || 1 : 1;
  addToCartById(id, qty);
}

/* ---------- Order placement ---------- */
function placeOrder(name, contact, address){
  const cur = getCurrent();
  if(!cur) { alert('Please login'); location.href='index.html'; return; }
  const cart = getCart();
  if(cart.length === 0) return alert('Cart empty');

  // double-check sold-out items in cart (prevent race)
  const soldOut = getSoldOutItems();
  const blocked = cart.filter(it => soldOut.includes(it.id));
  if(blocked.length > 0) {
    alert('Some items in your cart are sold out. Please remove them before placing the order.');
    return;
  }

  const subtotal = calcSubtotal();
  const orders = read(KEY_ORDERS, []);
  const order = {
    id: 'o' + Date.now(),
    userId: cur.id,
    userEmail: cur.email,
    fullname: name,
    contact,
    location: address,
    items: cart,
    itemsTotal: subtotal,
    deliveryFee: DELIVERY_FEE,
    total: subtotal + DELIVERY_FEE,
    payment: 'COD',
    status: 'Pending',
    date: new Date().toISOString()
  };
  orders.push(order);
  write(KEY_ORDERS, orders);
  saveCart([]); // empty cart
  alert('✅ Order placed successfully!');
  location.href = 'orders.html';
}

/* ---------- User Order page ---------- */
function renderUserOrders(){
  const cur = getCurrent();
  if(!cur){ location.href='index.html'; return; }
  const orders = read(KEY_ORDERS, []);
  const mine = orders.filter(o => o.userId === cur.id).slice().reverse();
  const list = document.getElementById('ordersList');
  const no = document.getElementById('noOrders');
  if(!list) return;
  if(mine.length === 0){
    list.innerHTML = '';
    if(no) no.style.display = 'block';
    return;
  }
  if(no) no.style.display = 'none';
  list.innerHTML = mine.map(o => orderCardHtmlForUser(o)).join('');
}

function orderCardHtmlForUser(o){
  const statusBadge = statusBadgeHtml(o.status);
  const itemsText = o.items.map(i => `${i.name} ×${i.qty}`).join('<br>');
  const canCancel = o.status === 'Pending';
  return `
    <div class="order-card">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div><strong>${o.id}</strong><div class="muted small">${new Date(o.date).toLocaleString()}</div></div>
        <div>${statusBadge}</div>
      </div>
      <div style="margin-top:8px">${itemsText}</div>
      <div class="muted small" style="margin-top:8px">Delivery: ${o.fullname} • ${o.contact} • ${o.location}</div>
      <div style="margin-top:8px;display:flex;gap:8px;align-items:center;">
        <div><strong>Total:</strong> ₱${Number(o.total).toFixed(2)}</div>
        <div style="margin-left:auto">
          ${canCancel ? `<button class="btn small ghost" onclick="cancelOrder('${o.id}')">Cancel Order</button>` : ''}
        </div>
      </div>
    </div>
  `;
}

function statusBadgeHtml(status){
  const map = {
    'Pending': `<span class="order-status status-Pending">Pending</span>`,
    'Preparing': `<span class="order-status status-Preparing">Preparing</span>`,
    'Out for Delivery': `<span class="order-status status-Out">Out for Delivery</span>`,
    'Delivered': `<span class="order-status status-Delivered">Delivered</span>`
  };
  return map[status] || `<span class="order-status">${status}</span>`;
}

function cancelOrder(id){
  if(!confirm('Cancel this order?')) return;
  let orders = read(KEY_ORDERS, []);
  const ord = orders.find(o => o.id === id);
  if(!ord) return alert('Order not found');
  if(ord.status !== 'Pending') return alert('Only pending orders can be canceled.');
  orders = orders.filter(o => o.id !== id);
  write(KEY_ORDERS, orders);
  renderUserOrders();
}

/* ---------- Admin page (orders) ---------- */
function renderAdminOrders(){
  const cur = getCurrent();
  if(!cur || cur.role !== 'admin'){ alert('Admin access only'); location.href='index.html'; return; }
  const orders = read(KEY_ORDERS, []).slice().reverse();
  const wrap = document.getElementById('adminOrders');
  const no = document.getElementById('noAdminOrders');
  if(!wrap) return;
  if(orders.length === 0){ wrap.innerHTML = ''; if(no) no.style.display = 'block'; return; }
  if(no) no.style.display = 'none';
  wrap.innerHTML = orders.map(o => adminOrderHtml(o)).join('');
}

function adminOrderHtml(o){
  const itemsText = o.items.map(i => `${i.name} ×${i.qty}`).join('<br>');
  return `
    <div class="order-card">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div><strong>${o.id}</strong><div class="muted small">${new Date(o.date).toLocaleString()}</div></div>
        <div>${statusBadgeHtml(o.status)}</div>
      </div>
      <div style="margin-top:8px">${itemsText}</div>
      <div class="muted small" style="margin-top:8px">${o.fullname} • ${o.contact} • ${o.location}</div>
      <div style="margin-top:8px;display:flex;gap:8px;align-items:center;">
        <div><strong>₱${Number(o.total).toFixed(2)}</strong></div>
        <div style="margin-left:auto">
          <select id="status_select_${o.id}">
            <option ${o.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option ${o.status === 'Preparing' ? 'selected' : ''}>Preparing</option>
            <option ${o.status === 'Out for Delivery' ? 'selected' : ''}>Out for Delivery</option>
            <option ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
          </select>
          <button class="btn small" onclick="adminUpdateStatus('${o.id}')">Save</button>
          <button class="btn small ghost" onclick="adminDeleteOrder('${o.id}')">Delete</button>
        </div>
      </div>
    </div>
  `;
}

function adminUpdateStatus(id){
  const sel = document.getElementById('status_select_' + id);
  if(!sel) return;
  const newStatus = sel.value;
  const orders = read(KEY_ORDERS, []);
  const ord = orders.find(o => o.id === id);
  if(!ord) return alert('Order not found');
  ord.status = newStatus;
  write(KEY_ORDERS, orders);
  renderAdminOrders();
}

function adminDeleteOrder(id){
  if(!confirm('Delete this order?')) return;
  let orders = read(KEY_ORDERS, []);
  orders = orders.filter(o => o.id !== id);
  write(KEY_ORDERS, orders);
  renderAdminOrders();
}

/* ---------- Admin Menu Editor (Sold Out) ---------- */
function renderAdminMenuList(){
  const cur = getCurrent();
  if(!cur || cur.role !== 'admin') return;
  const menuArea = document.getElementById('adminMenuList');
  if(!menuArea) return;

  const soldOut = getSoldOutItems();
  const sections = Object.keys(DEFAULT_MENU);

  menuArea.innerHTML = sections.map(sec => {
    const itemsHtml = DEFAULT_MENU[sec].map(i => {
      const isSold = soldOut.includes(i.id);
      return `
        <div class="item-row">
          <span>${i.name}</span>
          <div class="price">₱${Number(i.price).toFixed(2)}</div>
          <button class="btn small ${isSold ? 'ghost' : ''}" onclick="toggleSoldOut('${i.id}')">
            ${isSold ? 'Mark Available' : 'Mark Sold Out'}
          </button>
        </div>
      `;
    }).join('');
    return `
      <div class="card" style="margin-bottom:12px;">
        <h4 style="margin:0 0 8px 0;">${sec.charAt(0).toUpperCase() + sec.slice(1)}</h4>
        ${itemsHtml}
      </div>
    `;
  }).join('');
}

/* ---------- Profile functions ---------- */
function loadProfilePage(){
  const cur = getCurrent();
  if(!cur) { location.href='index.html'; return; }
  document.getElementById('profileName').value = cur.name || '';
  document.getElementById('profileEmail').value = cur.email || '';
}

function saveProfile(){
  const cur = getCurrent();
  if(!cur) return;
  const name = (document.getElementById('profileName')?.value || '').trim();
  const pass = (document.getElementById('profilePass')?.value || '').trim();
  const users = getUsers();
  for(let i=0;i<users.length;i++){
    if(users[i].id === cur.id){
      if(name) users[i].name = name;
      if(pass) users[i].pass = pass;
      saveUsers(users);
      saveCurrent({ id: users[i].id, name: users[i].name, email: users[i].email, role: users[i].role });
      alert('Profile updated.');
      return;
    }
  }
}

/* ---------- Page helpers ---------- */
function ensureLoggedIn(requiredRole){
  const cur = getCurrent();
  if(!cur) { location.href = 'index.html'; return; }
  if(requiredRole && cur.role !== requiredRole) {
    alert('Access denied.');
    location.href = cur.role === 'admin' ? 'admin.html' : 'order.html';
  }
}

/* ---------- Quick page init ---------- */
window.addEventListener('DOMContentLoaded', () => {
  renderCart();
});
