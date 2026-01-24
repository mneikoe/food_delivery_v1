# FoodExpress Web Application

A beautiful, fully responsive web application for managing the FoodExpress food delivery platform.

## Features

### 🌐 Public Landing Page (/)
- **Beautiful Hero Section** with call-to-action buttons
- **Statistics Display** showcasing platform metrics
- **Feature Highlights** explaining service benefits
- **How It Works** section with step-by-step guide
- **Popular Items Showcase** with product previews
- **App Download Section** with APK download link
- **Fully Responsive** design for all screen sizes
- **Smooth Animations** and modern UI/UX

### 🔐 Admin Panel (/admin)
Secure admin dashboard for managing the entire platform:

#### Dashboard
- Real-time statistics and metrics
- Total categories, products, coupons, and orders
- Pending orders count
- Quick overview cards

#### Categories Management
- Create, edit, and delete categories
- Upload category images
- Toggle active/inactive status
- Search and filter functionality

#### Products Management
- Add and manage products
- Set prices and preparation times
- Assign to categories
- Upload product images
- Mark as vegetarian/non-vegetarian
- Availability toggle

#### Coupons Management
- Create discount coupons
- Percentage or flat discount types
- Set minimum order values
- Maximum discount caps
- Validity periods
- Usage limits tracking

#### Offers Management
- Create promotional offers
- Upload offer banners
- Set validity dates
- Manage active/inactive status

#### Orders Management
- View all orders
- Update order status
- Assign delivery partners
- Track order progress
- Order details view

#### Delivery Partners
- Manage delivery personnel
- View partner details
- Track assignments

#### App Settings (NEW!)
- **Upload APK** for Android app distribution
- View current APK information
- Download link management
- File size and upload date tracking
- Delete and replace APK files

## 🎨 Responsive Design

### Mobile-First Approach
- ✅ **Breakpoints**: 576px, 768px, 992px, 1200px
- ✅ **Collapsible Sidebar** on mobile devices
- ✅ **Responsive Tables** with horizontal scroll
- ✅ **Touch-Friendly** buttons and interactions
- ✅ **Optimized Forms** for mobile input
- ✅ **Stack Layouts** on smaller screens

### Admin Panel Responsiveness
- Sidebar automatically collapses on tablets/mobile
- Tables scroll horizontally on small screens
- Forms stack vertically on mobile
- Touch-optimized buttons and controls
- Readable font sizes on all devices

### Landing Page Responsiveness
- Fluid layouts that adapt to screen size
- Mobile-optimized navigation menu
- Responsive images and cards
- Touch-friendly interactive elements
- Optimized typography for readability

## 🚀 Technology Stack

- **React 19** - Modern React with latest features
- **React Router DOM** - Client-side routing
- **Ant Design 5** - Professional UI component library
- **Vite** - Lightning-fast build tool
- **Axios** - HTTP client for API calls
- **Day.js** - Date manipulation
- **Supabase** - Authentication (OTP-based admin login)

## 📁 Project Structure

```
web/
├── src/
│   ├── api/
│   │   └── adminApi.js          # API service layer
│   ├── components/
│   │   ├── ProtectedRoute.jsx   # Auth guard
│   │   └── Sidebar.jsx           # Admin sidebar navigation
│   ├── pages/
│   │   ├── LandingPage.jsx       # Public home page (NEW!)
│   │   ├── LandingPage.css       # Landing page styles (NEW!)
│   │   ├── Login.jsx             # Admin login
│   │   ├── Dashboard.jsx         # Admin dashboard
│   │   ├── Categories.jsx        # Category management
│   │   ├── Products.jsx          # Product management
│   │   ├── Coupons.jsx           # Coupon management
│   │   ├── Offers.jsx            # Offers management
│   │   ├── Orders.jsx            # Order management
│   │   ├── DeliveryPartners.jsx # Delivery partner management
│   │   └── AppSettings.jsx       # APK upload & management (NEW!)
│   ├── services/
│   │   └── supabase.js           # Supabase configuration
│   ├── App.jsx                   # Main app component
│   ├── App.css                   # Global styles + responsive utilities
│   ├── index.css                 # Base styles
│   └── main.jsx                  # App entry point
├── public/
├── package.json
└── vite.config.js
```

## 🔄 Routing Structure

### Public Routes
- `/` - Landing page (Home)

### Admin Routes (Protected)
- `/admin/login` - Admin login
- `/admin` - Dashboard
- `/admin/categories` - Categories management
- `/admin/products` - Products management
- `/admin/coupons` - Coupons management
- `/admin/offers` - Offers management
- `/admin/orders` - Orders management
- `/admin/delivery-partners` - Delivery partners
- `/admin/app-settings` - APK upload & management

## 🎯 Key Features Implemented

### Landing Page
1. **Modern Hero Section**
   - Gradient background
   - Engaging copy
   - Download app CTA
   - Beautiful food imagery

2. **Statistics Section**
   - Live metrics display
   - Customer count, items, ratings
   - Professional presentation

3. **Features Grid**
   - 4 key features with icons
   - Hover animations
   - Clean card design

4. **How It Works**
   - 4-step process
   - Numbered badges
   - Clear descriptions

5. **Popular Items**
   - Product showcase
   - Images, prices, ratings
   - Hover effects

6. **Download Section**
   - Prominent download button
   - Feature checklist
   - Android app promotion

7. **Footer**
   - Company information
   - Quick links
   - Contact details
   - Professional layout

### App Settings (APK Management)
1. **Upload APK**
   - Drag & drop interface
   - File size validation
   - .apk format only

2. **APK Information**
   - Current version details
   - Upload date and size
   - Active status indicator

3. **Download Link**
   - Copyable URL
   - Direct download access
   - Landing page integration

4. **Setup Instructions**
   - Build commands
   - File location guide
   - Production notes

## 🎨 Design System

### Colors
- **Primary**: #10B981 (Green)
- **Secondary**: #059669 (Dark Green)
- **Text**: #1f2937 (Dark Gray)
- **Light**: #f9fafb (Light Gray)
- **Background**: Linear gradients

### Typography
- **Headings**: Bold, large, impactful
- **Body**: 16px base, 1.7 line-height
- **Responsive**: Scales down on mobile

### Components
- **Cards**: Rounded corners, subtle shadows
- **Buttons**: Large, prominent, clear actions
- **Tables**: Responsive, scrollable
- **Forms**: Clean, validated, user-friendly

## 📱 Mobile Optimization

### Performance
- Lazy loading for images
- Code splitting
- Optimized bundle size
- Fast initial load

### UX Enhancements
- Touch targets 44px minimum
- Swipe-friendly lists
- Bottom navigation consideration
- Readable text sizes

### Accessibility
- Semantic HTML
- ARIA labels
- Keyboard navigation
- Screen reader friendly

## 🔒 Security

- Admin routes protected by authentication
- Token-based sessions
- OTP verification for login
- Secure API communication

## 🚀 Getting Started

### 1. Environment Setup

Create a `.env` file in the `web/` directory:

```env
VITE_API_URL=http://localhost:8080/api
```

**Important**: Make sure your backend server is running on port 8080. The Vite dev server will automatically proxy all `/api/*` requests to the backend.

### 2. Install dependencies:
```bash
npm install
```

### 3. Start development server:
```bash
npm run dev
```

### 4. Build for production:
```bash
npm run build
```

### 5. Preview production build:
```bash
npm run preview
```

## 🌐 Environment Setup

Make sure your backend API is running and accessible. Update API endpoints in:
- `src/api/adminApi.js`

Configure Supabase credentials in:
- `src/services/supabase.js`

## 📊 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🎉 What's New

### v2.0.0 (Current Release)
- ✨ Beautiful landing page with modern design
- 📱 Fully responsive across all devices
- 🎨 Consistent design system
- 📦 APK upload and management system
- 🔄 Improved routing (/admin prefix for admin)
- 💅 Enhanced UI/UX throughout
- 📊 Better admin dashboard
- 🎯 Mobile-optimized navigation

## 🤝 Contributing

This is a production application. Follow best practices:
- Write clean, commented code
- Test responsive behavior
- Maintain consistent styling
- Update documentation

## 📄 License

Private - All rights reserved

---

Built with ❤️ for FoodExpress
