//  Import Firebase & Firestore Modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js';
import { 
    getFirestore, collection, addDoc, updateDoc, doc, deleteDoc, onSnapshot, query, orderBy, getDoc
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

//  Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyB8ZQwVy9jBebRp-yq04a8WyZ37-FD-zE",
  authDomain: "booklogapp-95f26.firebaseapp.com",
  projectId: "booklogapp-95f26",
  storageBucket: "booklogapp-95f26.appspot.com",
  messagingSenderId: "155655820398",
  appId: "1:155655820398:web:bb116216941b2e129d027f"
};

//  Initialize Firebase & Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

//  Ensure DOM is Fully Loaded Before Executing because things break sometimes
document.addEventListener("DOMContentLoaded", () => {
  //  Bio section to WORK
  if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
    alert("Biometric authentication only works on HTTPS or localhost.");
  }

  async function registerBiometric() {
    try {
      const publicKey = {
        challenge: new Uint8Array([/* challenge data */]),
        rp: { name: "Book Log App" },
        user: { id: new Uint8Array(16), name: "user@example.com", displayName: "User" },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        timeout: 60000,
        attestation: "direct"
      };
      
      const credential = await navigator.credentials.create({ publicKey });
      console.log('✅ Biometric registration successful!', credential);
    } catch (error) {
      console.error("❌ Biometric registration failed:", error);
      displayError("❌ Biometric registration failed. Please try again.");
    }
  }

  async function loginBiometric() {
    try {
      const publicKey = {
        challenge: new Uint8Array([/* challenge data */]),
        timeout: 60000,
        allowCredentials: [{ id: new Uint8Array(16), type: "public-key" }]
      };
  
      const assertion = await navigator.credentials.get({ publicKey });
      console.log('✅ Biometric authentication successful!', assertion);
    } catch (error) {
      console.error("❌ Biometric authentication failed:", error);
      displayError("❌ Biometric authentication failed. Please try again.");
    }
  }

  document.getElementById("register-biometric").addEventListener("click", registerBiometric);
  document.getElementById("login-biometric").addEventListener("click", loginBiometric);

  //  Book log Section
  const bookForm = document.getElementById("book-form");
  const bookList = document.getElementById("book-list");
  const submitBtn = document.getElementById("book-submit-btn");
  let editingDocId = null; // Track if editing a book

  // Function to display error messages
  function displayError(message) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message";
    errorDiv.textContent = message;
    document.body.prepend(errorDiv); // Display at the top

    // Remove the error message after 5 seconds
    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }

  // Fetch & Display Books in Real-Time
  function fetchBooks() {
    const q = query(collection(db, "books"), orderBy("timestamp", "desc"));
    onSnapshot(q, (snapshot) => {
      bookList.innerHTML = ""; // Clear list
      snapshot.forEach((doc) => {
        const book = doc.data();
        const li = document.createElement("li");
        li.classList.add("book-item");
        li.innerHTML = `
          <span>
            <strong>${book.title}</strong> by ${book.author}<br>
            <small>Added on: ${new Date(book.timestamp?.toDate()).toLocaleString()}</small>
          </span>
          <div class="book-actions">
            <button class="edit-btn" data-id="${doc.id}" aria-label="Edit ${book.title}" tabindex="0">✏️</button>
            <button class="delete-btn" data-id="${doc.id}" aria-label="Delete ${book.title}" tabindex="0">🗑</button>
          </div>
        `;
        bookList.appendChild(li);
      });
    });
  }

  fetchBooks(); // Load books on page load

  // Handle Book Form Submission (Add/Edit)
  bookForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("title").value.trim();
    const author = document.getElementById("author").value.trim();

    if (title === "" || author === "") {
      displayError("⚠️ Please enter both title and author.");
      return;
    }

    try {
      const timestamp = new Date();

      if (editingDocId) {
        // Update existing book
        await updateDoc(doc(db, "books", editingDocId), { title, author, timestamp });
        console.log("✅ Book updated!");
        editingDocId = null;
        submitBtn.textContent = "Add Book";
      } else {
        // Add new book
        await addDoc(collection(db, "books"), { title, author, timestamp });
        console.log("✅ Book added!");
      }

      bookForm.reset();
    } catch (error) {
      console.error("❌ Error adding/updating book: ", error);
      displayError("❌ Failed to save the book. Please try again.");
    }
  });

  // Handle Edit & Delete Actions
  bookList.addEventListener("click", async (e) => {
    if (e.target.classList.contains("edit-btn")) {
      editingDocId = e.target.getAttribute("data-id");
      const bookSnap = await getDoc(doc(db, "books", editingDocId));
      if (bookSnap.exists()) {
        const book = bookSnap.data();
        document.getElementById("title").value = book.title;
        document.getElementById("author").value = book.author;
        submitBtn.textContent = "Update Book";
      }
    } else if (e.target.classList.contains("delete-btn")) {
      const bookId = e.target.getAttribute("data-id");
      if (confirm("⚠️ Are you sure you want to delete this book?")) {
        try {
          await deleteDoc(doc(db, "books", bookId));
          console.log("🗑 Book deleted!");
        } catch (error) {
          console.error("❌ Error deleting book: ", error);
          displayError("❌ Failed to delete the book. Please try again.");
        }
      }
    }
  });

  // Chatbot Integration
  const chatForm = document.getElementById("chat-form");
  const chatBox = document.getElementById("chat-box");

  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const userInput = document.getElementById("user-input").value.trim();
    if (!userInput) return;

    displayMessage(`You: ${userInput}`, "user");

    try {
      const response = await fetch("https://dialogflow.googleapis.com/v2/projects/booklogapp-95f26/agent/sessions/123456:detectIntent", {
        method: "POST",
        headers: {
          "Authorization": `Seems hard to dynamically grab unless I'm working on backend stuff too.`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          queryInput: { text: { text: userInput, languageCode: "en" } }
        })
      });

      const data = await response.json();
      const botReply = data.queryResult.fulfillmentText || "I'm not sure how to respond.";
      displayMessage(`Bot: ${botReply}`, "bot");
    } catch (error) {
      console.error("❌ Chatbot error:", error);
      displayMessage("Bot: Sorry, I'm having trouble responding right now.", "bot");
    }

    document.getElementById("user-input").value = "";
  });

  function displayMessage(text, sender) {
    const msgDiv = document.createElement("div");
    msgDiv.textContent = text;
    msgDiv.className = sender === "user" ? "chat-user" : "chat-bot";
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
  }
});