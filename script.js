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
  // Check WebAuthn support in this browser
  if (window.PublicKeyCredential) {
    console.log("✅ WebAuthn is supported in this browser");
    
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      .then((available) => {
        if (available) {
          console.log("✅ Platform authenticator is available");
        } else {
          console.log("❌ No platform authenticator available");
          displayError("Your device doesn't seem to have biometric authentication capability.");
        }
      });
  } else {
    console.log("❌ WebAuthn is not supported in this browser");
    displayError("Your browser doesn't support biometric authentication.");
  }

  //  Check if HTTPS or localhost is being used
  if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
    displayError("Biometric authentication requires HTTPS. Some features may not work properly.");
  }

  let storedCredentialId = null; // Will store the credential ID after registration

  async function registerBiometric() {
    try {
      // Generate a random challenge
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      
      // Create a random user ID
      const userId = new Uint8Array(16);
      window.crypto.getRandomValues(userId);
      
      // Determine the correct rpId based on the current environment
      let rpId = window.location.hostname;
      
      // Special handling for GitHub Pages
      if (rpId.includes('github.io')) {
        // Extract just the github.io domain for proper WebAuthn functionality
        rpId = rpId.split('.').slice(-2).join('.');
      }
      
      console.log("Using rpId for registration:", rpId);
      
      const publicKey = {
        challenge: challenge,
        rp: { 
          name: "Book Log App",
          id: rpId
        },
        user: { 
          id: userId, 
          name: "user@example.com", 
          displayName: "User" 
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },  // ES256
          { type: "public-key", alg: -257 } // RS256
        ],
        timeout: 60000,
        attestation: "direct",
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "preferred"
        }
      };
      
      const credential = await navigator.credentials.create({ publicKey });
      
      // Store the credential ID for later authentication
      storedCredentialId = new Uint8Array(credential.rawId);
      
      // Save to localStorage for persistence
      localStorage.setItem('credentialId', arrayBufferToBase64(credential.rawId));
      
      console.log('✅ Biometric registration successful!', credential);
      displayMessage("Bot: Biometric registration successful!", "bot");
    } catch (error) {
      console.error("❌ Biometric registration failed:", error);
      displayError("❌ Biometric registration failed: " + error.message);
    }
  }

  async function loginBiometric() {
    try {
      // Get the stored credential ID (from memory or localStorage)
      if (!storedCredentialId) {
        const savedCredentialId = localStorage.getItem('credentialId');
        if (savedCredentialId) {
          storedCredentialId = base64ToArrayBuffer(savedCredentialId);
        } else {
          throw new Error("No credentials found. Please register first.");
        }
      }
      
      // Generate a random challenge
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      
      // Determine the correct rpId based on the current environment
      let rpId = window.location.hostname;
      
      // Special handling for GitHub Pages
      if (rpId.includes('github.io')) {
        // Extract just the github.io domain for proper WebAuthn functionality
        rpId = rpId.split('.').slice(-2).join('.');
      }
      
      console.log("Using rpId for login:", rpId);
      
      const publicKey = {
        challenge: challenge,
        timeout: 60000,
        rpId: rpId,
        allowCredentials: [{
          id: storedCredentialId,
          type: "public-key"
        }],
        userVerification: "preferred"
      };
    
      const assertion = await navigator.credentials.get({ publicKey });
      console.log('✅ Biometric authentication successful!', assertion);
      displayMessage("Bot: Biometric authentication successful!", "bot");
    } catch (error) {
      console.error("❌ Biometric authentication failed:", error);
      displayError("❌ Biometric authentication failed: " + error.message);
    }
  }

  // Helper functions for converting between ArrayBuffer and Base64
  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  function base64ToArrayBuffer(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
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
    try {
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
      }, (error) => {
        console.error("Error fetching books:", error);
        displayError("❌ Failed to load books: " + error.message);
      });
    } catch (error) {
      console.error("Error setting up books listener:", error);
      displayError("❌ Failed to connect to database: " + error.message);
    }
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

  // Chatbot Integration - Simple keyword-based implementation
  const chatForm = document.getElementById("chat-form");
  const chatBox = document.getElementById("chat-box");

  // Simple responses based on keywords
  const botResponses = {
    "hello": "Hello there! How can I help you with your book collection today?",
    "hi": "Hi there! Need help with tracking your books?",
    "book": "I can help you manage your book collection. Try adding a new book with the form above.",
    "recommend": "Based on your collection, you might enjoy reading 'The Midnight Library' by Matt Haig.",
    "help": "I can help with adding books, finding recommendations, or using the app. What do you need?",
    "delete": "To delete a book, click the trash icon next to any book in your list.",
    "edit": "To edit a book, click the pencil icon next to any book in your list.",
    "add": "To add a new book, fill out the title and author in the form and click 'Add Book'."
  };

  // Display initial welcome message
  setTimeout(() => {
    displayMessage("Bot: Welcome to Book Log! How can I help you today?", "bot");
  }, 1000);

  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const userInput = document.getElementById("user-input").value.trim().toLowerCase();
    if (!userInput) return;

    displayMessage(`You: ${userInput}`, "user");

    // Process the user input and generate a response
    let botReply = "I'm not sure how to respond to that. Try asking about books, recommendations, or how to use the app.";
    
    // Check for keywords in the user input
    for (const [keyword, response] of Object.entries(botResponses)) {
      if (userInput.includes(keyword)) {
        botReply = response;
        break;
      }
    }

    // Simulate a brief delay for more natural interaction
    setTimeout(() => {
      displayMessage(`Bot: ${botReply}`, "bot");
    }, 500);

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