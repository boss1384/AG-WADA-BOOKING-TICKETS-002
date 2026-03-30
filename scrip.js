// ================== PI NETWORK ==================
Pi.init({ version: "2.0" });

let user = null;
let cart = [];

// ================== FIREBASE ==================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// 🔥 YOUR CONFIG (replace with your real one)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "XXXX",
  appId: "XXXX"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// ================== LOGIN ==================
async function login() {
  try {
    const scopes = ["username", "payments"];
    const auth = await Pi.authenticate(scopes);

    user = auth.user;

    document.getElementById("user").innerText =
      "Welcome " + user.username;

    loadAds();
  } catch (e) {
    console.error(e);
  }
}

window.login = login;

// ================== POST AD ==================
async function postAd() {
  const fileInput = document.getElementById("image");
  const titleInput = document.getElementById("title");
  const priceInput = document.getElementById("price");

  const file = fileInput.files[0];
  const title = titleInput.value;
  const price = priceInput.value;

  if (!file || !title || !price) {
    alert("Fill all fields");
    return;
  }

  try {
    // Upload image
    const storageRef = ref(storage, "ads/" + Date.now());
    await uploadBytes(storageRef, file);
    const imageUrl = await getDownloadURL(storageRef);

    // Save to Firestore
    await addDoc(collection(db, "ads"), {
      title: title,
      price: parseFloat(price),
      image: imageUrl,
      owner: user.username,
      createdAt: Date.now()
    });

    alert("✅ Advert posted!");
    loadAds();

  } catch (error) {
    console.error(error);
    alert("❌ Error posting ad");
  }
}

window.postAd = postAd;

// ================== LOAD ADS ==================
async function loadAds() {
  const container = document.getElementById("ads");

  container.innerHTML = "Loading...";

  const q = query(collection(db, "ads"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  container.innerHTML = "";

  snapshot.forEach(doc => {
    const ad = doc.data();

    container.innerHTML += `
      <div class="card">
        <img src="${ad.image}" style="width:100%">
        <h3>${ad.title}</h3>
        <p>${ad.price} Pi</p>
        <small>Seller: ${ad.owner}</small><br>
        <button onclick="addToCart('${doc.id}', ${ad.price}, '${ad.title}')">
          Add to Cart
        </button>
      </div>
    `;
  });
}

// ================== CART ==================
function addToCart(id, price, title) {
  cart.push({ id, price, title });
  renderCart();
}

window.addToCart = addToCart;

function renderCart() {
  const container = document.getElementById("cart");

  container.innerHTML = "";

  let total = 0;

  cart.forEach(item => {
    container.innerHTML += `<p>${item.title} - ${item.price} Pi</p>`;
    total += item.price;
  });

  document.getElementById("total").innerText =
    "Total: " + total + " Pi";
}

// ================== CHECKOUT ==================
function checkout() {
  if (cart.length === 0) {
    alert("Cart is empty");
    return;
  }

  const total = cart.reduce((sum, item) => sum + item.price, 0);

  Pi.createPayment({
    amount: total,
    memo: "AG WADA ORDER",
    metadata: cart
  }, {
    onReadyForServerApproval: paymentId => {
      console.log(paymentId);
    },
    onReadyForServerCompletion: paymentId => {
      alert("✅ Payment successful!");
      cart = [];
      renderCart();
    },
    onCancel: () => {
      alert("❌ Payment cancelled");
    }
  });
}

window.checkout = checkout;
