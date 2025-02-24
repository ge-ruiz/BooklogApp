// 🔹 Import Firebase & Firestore Modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js';
import { 
    getFirestore, collection, addDoc, updateDoc, doc, deleteDoc, onSnapshot, query, orderBy, getDoc
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

// 🔹 Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyB8ZQwVy9jBebRp-yq04a8WyZ37-FD-zE",
  authDomain: "booklogapp-95f26.firebaseapp.com",
  projectId: "booklogapp-95f26",
  storageBucket: "booklogapp-95f26.appspot.com",
  messagingSenderId: "155655820398",
  appId: "1:155655820398:web:bb116216941b2e129d027f"
};

// 🔹 Initialize Firebase & Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 🔹 Ensure DOM is Fully Loaded Before Executing
document.addEventListener("DOMContentLoaded", () => {
  const bookForm = document.getElementById("book-form");
  const bookList = document.getElementById("book-list");
  const submitBtn = document.getElementById("book-submit-btn");
  const chatForm = document.getElementById("chat-form");
  const chatBox = document.getElementById("chat-box");
  let editingDocId = null; // Track if editing a book

  // 📚 Fetch and Display Books (Real-Time Updates)
  const fetchBooks = () => {
    const q = query(collection(db, "books"), orderBy("timestamp", "desc"));
    onSnapshot(q, (snapshot) => {
      bookList.innerHTML = ""; // Clear existing list
      snapshot.forEach((doc) => {
        const book = doc.data();
        const li = document.createElement("li");
        li.innerHTML = `
          <strong>${book.title}</strong> by ${book.author} 
          <button class="edit-btn" data-id="${doc.id}">✏️ Edit</button>
          <button class="delete-btn" data-id="${doc.id}">🗑 Delete</button>
        `;
        bookList.appendChild(li);
      });
    });
  };

  fetchBooks(); // Load books on page load

  // 📚 Handle Form Submission (Add/Edit Book)
  bookForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // Prevent page reload

    const title = document.getElementById("title").value.trim();
    const author = document.getElementById("author").value.trim();

    if (title === "" || author === "") {
      alert("⚠️ Please enter both title and author.");
      return;
    }

    try {
      const timestamp = new Date();

      if (editingDocId) {
        // If editing, update the existing book in Firestore
        const bookRef = doc(db, "books", editingDocId);
        await updateDoc(bookRef, { title, author, timestamp });
        console.log("✅ Book updated!");
        editingDocId = null; // Reset editing state
        submitBtn.textContent = "Add Book"; // Reset button text
      } else {
        // If adding a new book, save it in Firestore
        await addDoc(collection(db, "books"), { title, author, timestamp });
        console.log("✅ Book added!");
      }

      bookForm.reset(); // Reset form fields
    } catch (error) {
      console.error("❌ Error adding/updating document: ", error);
    }
  });

  // 📚 Handle Edit & Delete Actions (Event Delegation)
  bookList.addEventListener("click", async (e) => {
    if (e.target.classList.contains("edit-btn")) {
      // Edit Book
      editingDocId = e.target.getAttribute("data-id");
      const bookRef = doc(db, "books", editingDocId);
      const bookSnap = await getDoc(bookRef);
      if (bookSnap.exists()) {
        const book = bookSnap.data();
        document.getElementById("title").value = book.title;
        document.getElementById("author").value = book.author;
        submitBtn.textContent = "Update Book"; // Change button text
      }
    } else if (e.target.classList.contains("delete-btn")) {
      // Delete Book
      const bookId = e.target.getAttribute("data-id");
      if (confirm("⚠️ Are you sure you want to delete this book?")) {
        await deleteDoc(doc(db, "books", bookId));
        console.log("🗑 Book deleted!");
      }
    }
  });

  // 💬 Dialogflow Chatbot Integration
  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // Prevent page reload

    const userInput = document.getElementById("user-input").value.trim();
    if (userInput === "") return;

    displayMessage("You: " + userInput, "user");

    try {
      const response = await fetch("https://dialogflow.googleapis.com/v2/projects/booklogapp-95f26/agent/sessions/123456:detectIntent", {
        method: "POST",
        headers: {
          "Authorization": `Bearer YOUR_DIALOGFLOW_ACCESS_TOKEN`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          queryInput: {
            text: {
              text: userInput,
              languageCode: "en"
            }
          }
        })
      });

      const data = await response.json();
      const botReply = data.queryResult.fulfillmentText || "I'm not sure how to respond.";
      displayMessage("Bot: " + botReply, "bot");
    } catch (error) {
      console.error("❌ Error communicating with chatbot:", error);
      displayMessage("Bot: Sorry, I'm having trouble responding right now.", "bot");
    }

    document.getElementById("user-input").value = ""; // Clear input field
  });

  // 💬 Function to Display Messages in Chatbox
  function displayMessage(text, sender) {
    const msgDiv = document.createElement("div");
    msgDiv.textContent = text;
    msgDiv.style.padding = "8px";
    msgDiv.style.margin = "5px";
    msgDiv.style.borderRadius = "5px";
    msgDiv.style.maxWidth = "80%";

    if (sender === "user") {
      msgDiv.style.backgroundColor = "#007BFF";
      msgDiv.style.color = "white";
      msgDiv.style.alignSelf = "flex-end";
    } else {
      msgDiv.style.backgroundColor = "#f1f1f1";
      msgDiv.style.color = "black";
      msgDiv.style.alignSelf = "flex-start";
    }

    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll
  }

// Ensure the page is served over HTTPS or localhost
if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
    alert("Biometric authentication only works on HTTPS or localhost.");
}

// Function to register biometric
async function registerBiometric() {
    try {
      const publicKey = {
        challenge: new Uint8Array([/* Your challenge data */]),
        rp: {
          name: "Book Log App"
        },
        user: {
          id: new Uint8Array(16),
          name: "user@example.com",
          displayName: "User"
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 }, // ES256
          { type: "public-key", alg: -257 } // RS256
        ],
        timeout: 60000,
        attestation: "direct"
      };
      
      const credential = await navigator.credentials.create({ publicKey });
      console.log('Biometric registration successful!', credential);
    } catch (error) {
      console.error("Biometric registration failed:", error);
    }
  }
  
  // Function to authenticate using biometric
  async function loginBiometric() {
    try {
      const publicKey = {
        challenge: new Uint8Array([/* Your challenge data */]),
        timeout: 60000,
        allowCredentials: [{
          id: new Uint8Array(16),
          type: "public-key",
        }]
      };
  
      const assertion = await navigator.credentials.get({ publicKey });
      console.log('Biometric authentication successful!', assertion);
    } catch (error) {
      console.error("Biometric authentication failed:", error);
    }
  }
  
  // Add event listeners to buttons
  document.getElementById("register-biometric").addEventListener("click", registerBiometric);
  document.getElementById("login-biometric").addEventListener("click", loginBiometric);
});
