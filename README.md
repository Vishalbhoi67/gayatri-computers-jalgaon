# 💻 Gayatri Computers - Sales & Service Web Application

A fully responsive, feature-rich web application built for a computer sales and service center, enabling seamless product exploration, purchase inquiries, and real-time service ticket tracking.


## ✨ Key Features

- **Product Catalog:** Explore various computer hardware, accessories, and components with detailed views.
- **Purchase Inquiries:** Customers can easily send inquiries for products.
- **Service Ticket Tracking:** Real-time tracking system allowing customers to check the status of their repair or service requests.
- **Admin Dashboard:** Integrated management tools for updating products, handling service tickets, and viewing customer logs.
- **Interactive UI/UX:** Built with modern design principles, smooth layouts, and fully responsive for all screen sizes (Mobile, Tablet, Desktop).


## 🛠️ Technologies Used

- **Frontend:** HTML5, CSS3, JavaScript (ES6)
- **Backend & Database:** Firebase (Authentication, Firestore Database, and Hosting)
- **Deployment:** Firebase Hosting & GitHub


## 🚀 Project Structure

```text
gayatri-computers/
│
├── index.html          # Home page
├── products.html       # Product catalog & details
├── services.html       # Services information page
├── track.html          # Service ticket tracking page
├── admin.html          # Admin dashboard panel
├── contact.html        # Contact and inquiry page
├── 404.html            # Custom error page
├── css/                # Stylesheets (style.css)
├── js/                 # JavaScript logic (app.js, admin.js, products.js, etc.)
├── assets/             # Images, banners, and product graphics
└── firebase.json       # Firebase hosting configuration

## ⚙️ How It Works / Working Flow
User Exploration: Visitors land on the Home page (index.html), where they can explore featured hardware items and company services.

Inquiry & Orders: Users can navigate to the products page to check specifications and submit inquiries.

Service Support & Tracking: Customers who submit a computer for repair receive a ticket ID. They can use the Tracking system (track.html) to check the live status of their repair service.

Admin Control: The store administrator logs into the secure admin panel (admin.html) to update service progress, manage incoming tickets, and handle inventory logs stored securely in the Firebase database.

## 🔒 Security Note
Sensitive configuration files (such as firebase-config.js) containing database keys are handled securely and excluded from public version control using .gitignore.
