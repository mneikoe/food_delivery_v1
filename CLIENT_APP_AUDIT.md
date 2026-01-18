# React Native Food Delivery App - Complete Architecture & Flow Documentation

## 📱 Application Overview

**Framework:** React Native CLI (TypeScript)  
**Backend:** Node.js + Express + MongoDB  
**Realtime:** Supabase Realtime  
**Navigation:** React Navigation (Stack + Bottom Tabs)  
**State Management:** React Context API  
**Storage:** AsyncStorage (JWT tokens, location data)

---

## 🏗️ Architecture Overview

### Core Structure
```
client/src/
├── api/              # API client & location services
├── assets/           # Images & static assets
├── components/       # Reusable UI components
├── context/          # Global state (Auth, Location)
├── layouts/          # App layout wrapper
├── navigation/       # Navigation configuration
├── screens/          # Screen components
├── services/         # External services (Supabase)
├── theme/            # Design tokens (colors)
└── utils/            # Utility functions
```

### Navigation Architecture

**RootNavigator** (Stack Navigator)
- **Unauthenticated:** LoginScreen
- **Authenticated:** AppLayout (wraps role-based tabs)
  - **User Screens:** ProductDetails, OrderDetails
  - **Delivery Partner Screens:** DeliveryOrderDetails, OTPVerification

**AppLayout** (Role-based wrapper)
- Shows AppHeader (fixed top)
- Conditionally renders:
  - **USER role:** BottomTabs (Home, Products, Cart, Orders, Profile)
  - **DELIVERY_PARTNER role:** DeliveryBottomTabs (AssignedOrders, OrderHistory, Profile)

---

## 🔐 Authentication Flow

### Context: AuthContext
- **State:** `token`, `user`, `loading`
- **Methods:** `login(jwt, userData?)`, `logout()`
- **Storage:** JWT token in AsyncStorage (`AUTH_TOKEN`)

### Login Flow
1. **LoginScreen** → User enters email
2. API: `POST /api/auth/send-email-otp` → Sends OTP
3. User enters OTP
4. API: `POST /api/auth/verify-email-otp` → Returns JWT + user data
5. `AuthContext.login()` → Stores token, sets user
6. **RootNavigator** detects token → Shows AppLayout

### Auth Persistence
- On app start, `AuthContext` loads token from AsyncStorage
- Fetches user profile: `GET /api/user/profile`
- If profile fetch fails → Clears token, shows LoginScreen

---

## 📍 Location Management

### Context: LocationContext
- **State:** `location` (city, suburb, state, country, address, isManual)
- **Storage:** Last known city in AsyncStorage (`LAST_KNOWN_CITY`)
- **Methods:** `setLocation(loc)` → Persists to AsyncStorage

### Location Flow
1. **HomeScreen** auto-fetches location on mount (if not manual)
2. **LocationApi.updateUserLocation()**:
   - Gets GPS coordinates via `getCurrentLocation()`
   - Calls API based on role:
     - **USER:** `POST /api/user/location/update`
     - **DELIVERY_PARTNER:** `POST /api/delivery/location/update`
   - Backend reverse geocodes → Returns location object
   - Updates LocationContext
3. **Manual Fallback:** ManualCitySelector component
4. Location displayed in AppHeader

---

## 📄 Screen-by-Screen Documentation

### 1. LoginScreen
**File:** `client/src/screens/LoginScreen.tsx`  
**Route:** `Login` (Stack)  
**Access:** Unauthenticated users

**APIs Used:**
- `POST /api/auth/send-email-otp` - Send OTP to email
- `POST /api/auth/verify-email-otp` - Verify OTP and get JWT

**Flow:**
1. User enters email → `sendOtp()` → Shows OTP input
2. User enters OTP → `verifyOtp()` → Calls `AuthContext.login()`
3. Navigation handled by RootNavigator (token detected)

**State:**
- `email` - User email
- `otp` - OTP code
- `step` - 'EMAIL' | 'OTP'

---

### 2. AuthCallbackScreen
**File:** `client/src/screens/AuthCallbackScreen.tsx`  
**Route:** Not in RootNavigator (legacy/optional)  
**Purpose:** Supabase auth callback handler

**APIs Used:**
- `POST /api/auth/verify-session` - Verify Supabase session

**Flow:**
- Gets Supabase session → Verifies with backend → Logs in

---

### 3. HomeScreen
**File:** `client/src/screens/HomeScreen.tsx`  
**Route:** `Home` (Bottom Tab - User only)  
**Access:** Authenticated USER role

**APIs Used:**
- `GET /api/user/categories` - Fetch all categories
- `GET /api/user/products` - Fetch all products
- `POST /api/user/location/update` or `/api/delivery/location/update` - Update location

**Features:**
- Auto-fetches location on mount
- Displays categories in horizontal scroll
- Displays products in carousels ("Chef's Selection", "Popular Now")
- Location error banner with retry/manual selector
- Category press → Navigate to ProductScreen with `categoryId`
- Product press → Navigate to ProductDetailsScreen

**State:**
- `categories` - Category list
- `products` - Product list
- `locationError` - Location error message
- `isLoadingLocation` - Location loading state
- `showManualSelector` - Manual city selector visibility

**Components Used:**
- ProductCard
- ManualCitySelector

---

### 4. ProductScreen
**File:** `client/src/screens/ProductScreen.tsx`  
**Route:** `Products` (Bottom Tab - User) + Stack screen  
**Access:** Authenticated users

**APIs Used:**
- `GET /api/user/products?categoryId=<id>` - Products by category
- `GET /api/user/products?search=<query>` - Search products

**Features:**
- Search bar with 500ms debounce
- Category filter (if `categoryId` in route params)
- Product list using SearchItemCard
- Product press → Navigate to ProductDetailsScreen

**Route Params:**
- `categoryId` (optional) - Filter by category
- `categoryName` (optional) - Display in header

**State:**
- `products` - Filtered product list
- `searchQuery` - Search input value
- `loading` - Loading state

**Components Used:**
- SearchItemCard

---

### 5. ProductDetailsScreen
**File:** `client/src/screens/ProductDetailsScreen.tsx`  
**Route:** `ProductDetails` (Stack)  
**Access:** Authenticated users

**Route Params:**
- `item` - Product object

**Features:**
- Hero-style product image (320px height)
- Product name, price, description
- Image fallback with icon
- ScrollView for long content
- Safe area aware

**Data Displayed:**
- `item.name` - Product name
- `item.price` - Product price
- `item.description` - Product description
- `item.image` - Product image URL

**No APIs** - Displays data from route params only

---

### 6. CartScreen
**File:** `client/src/screens/CartScreen.tsx`  
**Route:** `Cart` (Bottom Tab - User only)  
**Access:** Authenticated USER role

**APIs Used:**
- `GET /api/user/cart` - Fetch cart items
- `PUT /api/user/cart/items/:id` - Update item quantity
- `POST /api/user/orders` - Place order (paymentMethod: "COD")

**Features:**
- Displays cart items with images, names, prices
- Quantity controls (+ / -)
- Delivery address from LocationContext (read-only)
- Location validation before order placement
- Sticky footer with order summary (subtotal, delivery fee, total)
- Place Order button (disabled if location missing)
- Empty state with "Start Shopping" button

**State:**
- `cart` - Cart object with items
- `loading` - Loading state
- `placingOrder` - Order placement state

**Flow:**
1. On mount → Fetch cart
2. User updates quantity → `updateQuantity()` → Refetch cart
3. User places order → Validates location → `POST /api/user/orders`
4. On success → Clear cart state → Navigate to OrdersScreen

**Safe Area:** Footer uses `useSafeAreaInsets` for bottom padding

---

### 7. OrdersScreen
**File:** `client/src/screens/OrdersScreen.tsx`  
**Route:** `Orders` (Bottom Tab - User only)  
**Access:** Authenticated USER role

**APIs Used:**
- `GET /api/user/orders` - Fetch user orders

**Features:**
- List of all user orders
- Order cards show: Order ID, date, status, total amount
- Status badges with color coding
- Pull-to-refresh
- Order press → Navigate to OrderDetailsScreen

**State:**
- `orders` - Order list
- `loading` - Loading state
- `refreshing` - Refresh state

**Status Colors:**
- DELIVERED: Green (#10B981)
- CANCELLED: Red (#EF4444)
- CREATED: Gray (#6B7280)
- ASSIGNED_TO_DELIVERY: Blue (#3B82F6)
- PICKED_UP: Orange (#F59E0B)
- OUT_FOR_DELIVERY: Purple (#8B5CF6)
- ARRIVED_AT_LOCATION: Purple (#8B5CF6)

---

### 8. OrderDetailsScreen
**File:** `client/src/screens/OrderDetailsScreen.tsx`  
**Route:** `OrderDetails` (Stack)  
**Access:** Authenticated USER role

**APIs Used:**
- `GET /api/user/orders/:id` - Fetch order details

**Realtime:**
- Supabase channel: `user_<userId>_orders`
- Event: `order_update`
- On update → Refetches order details

**Features:**
- Order header (ID, date, status badge)
- Order items list
- Delivery address
- Delivery partner details (name, phone) if assigned
- Order summary (subtotal, delivery fee, discount, total)
- Payment method
- **OTP Display:** Shows delivery OTP prominently when `status === "ARRIVED_AT_LOCATION"`
- Pull-to-refresh

**Route Params:**
- `orderId` - Order ID

**State:**
- `order` - Order details
- `loading` - Loading state
- `refreshing` - Refresh state

**OTP Display:**
- Large OTP code (48px font)
- Message: "Share this OTP with delivery partner to complete delivery"
- Only visible when `order.status === "ARRIVED_AT_LOCATION"` and `order.deliveryOTP?.code` exists

---

### 9. ProfileScreen
**File:** `client/src/screens/ProfileScreen.tsx`  
**Route:** `Profile` (Bottom Tab - Both roles)  
**Access:** Authenticated users (USER & DELIVERY_PARTNER)

**APIs Used:**
- `POST /api/user/location/update` or `/api/delivery/location/update` - Update location (role-based)

**Features:**
- User profile header (avatar, name, email)
- Personal information (name, email, role)
- Current location display (suburb, city, state, country, address)
- Location update button
- Order History option (hidden for delivery partners - they have tab)
- Logout button

**State:**
- `isUpdatingLocation` - Location update state

**Role-based Behavior:**
- **USER:** Shows "Order History" option → Navigates to Orders tab
- **DELIVERY_PARTNER:** Hides "Order History" option (has OrderHistory tab)

**Safe Area:** Header uses `useSafeAreaInsets` for top padding

---

### 10. AssignedOrdersScreen
**File:** `client/src/screens/AssignedOrdersScreen.tsx`  
**Route:** `AssignedOrders` (DeliveryBottomTabs - default tab)  
**Access:** Authenticated DELIVERY_PARTNER role

**APIs Used:**
- `GET /api/delivery/assigned-orders` - Fetch assigned orders

**Realtime:**
- Supabase channel: `delivery_<deliveryPartnerId>_orders`
- Event: `order_update`
- On update → Refetches orders list

**Features:**
- List of assigned orders (ASSIGNED_TO_DELIVERY, PICKED_UP, OUT_FOR_DELIVERY, ARRIVED_AT_LOCATION)
- Order cards show: Order ID, customer name, status, total amount, date
- Status badges with color coding
- Pull-to-refresh
- Order press → Navigate to DeliveryOrderDetailsScreen

**State:**
- `orders` - Assigned orders list
- `loading` - Loading state
- `refreshing` - Refresh state

---

### 11. DeliveryOrderDetailsScreen
**File:** `client/src/screens/DeliveryOrderDetailsScreen.tsx`  
**Route:** `DeliveryOrderDetails` (Stack)  
**Access:** Authenticated DELIVERY_PARTNER role

**APIs Used:**
- `GET /api/delivery/assigned-orders` - Fetch orders (filters by orderId)
- `POST /api/delivery/orders/:id/accept` - Accept order
- `POST /api/delivery/orders/:id/status` - Update order status
- Google Maps (via Linking) - Navigation to delivery address

**Realtime:**
- Supabase channel: `delivery_<deliveryPartnerId>_orders`
- Event: `order_update`
- On update → Refetches order details

**Features:**
- Order header (ID, status badge)
- Customer details (name, phone)
- Delivery address with Google Maps button
- Order items list
- Order summary (subtotal, delivery fee, total)
- **Status-based action buttons:**
  - ASSIGNED_TO_DELIVERY → "Accept Order"
  - PICKED_UP → "Out for Delivery"
  - OUT_FOR_DELIVERY → "Arrived at Location"
  - ARRIVED_AT_LOCATION → "Verify OTP" (navigates to OTPVerificationScreen)

**Route Params:**
- `orderId` - Order ID

**State:**
- `order` - Order details
- `loading` - Loading state
- `actionLoading` - Action button loading state

**Google Maps Integration:**
- Uses latitude/longitude if available
- Falls back to address string if coordinates missing
- Opens Google Maps app with directions/search

**Safe Area:** Header uses `useSafeAreaInsets` for top padding, ScrollView uses bottom padding

---

### 12. OTPVerificationScreen
**File:** `client/src/screens/OTPVerificationScreen.tsx`  
**Route:** `OTPVerification` (Stack)  
**Access:** Authenticated DELIVERY_PARTNER role

**APIs Used:**
- `POST /api/delivery/orders/:id/verify-otp` - Verify delivery OTP

**Features:**
- 4-digit OTP input (numeric only, auto-focus)
- OTP validation (must be 4 digits)
- Verify button (disabled until 4 digits entered)
- On success → Navigates back to App (AssignedOrders tab)
- On error → Shows error alert

**Route Params:**
- `orderId` - Order ID

**State:**
- `otp` - OTP input value
- `loading` - Verification state

**Flow:**
1. User enters 4-digit OTP
2. Clicks "Verify OTP"
3. API call → Backend verifies OTP and marks order as DELIVERED
4. Success alert → Navigate to App (AssignedOrders tab)

---

### 13. OrderHistoryScreen
**File:** `client/src/screens/OrderHistoryScreen.tsx`  
**Route:** `OrderHistory` (DeliveryBottomTabs)  
**Access:** Authenticated DELIVERY_PARTNER role

**APIs Used:**
- `GET /api/delivery/delivery-history` - Fetch delivered orders

**Features:**
- List of all DELIVERED orders
- Order cards show: Order ID, customer name, total amount, delivery date
- Read-only view
- Pull-to-refresh
- Order press → Navigate to DeliveryOrderDetailsScreen (read-only)

**State:**
- `orders` - Delivered orders list
- `loading` - Loading state
- `refreshing` - Refresh state

---

## 🔄 Complete User Flows

### USER Flow: Shopping & Ordering

1. **Login** → LoginScreen → Email OTP → Verify → AppLayout
2. **Home** → HomeScreen → Auto-fetches location → Shows categories & products
3. **Browse** → Category press → ProductScreen (filtered) → Product press → ProductDetailsScreen
4. **Add to Cart** → ProductCard/SearchItemCard → `POST /api/user/cart/items`
5. **Cart** → CartScreen → View items → Update quantities → Place Order
6. **Order Placement** → Validates location → `POST /api/user/orders` → Navigate to OrdersScreen
7. **Orders** → OrdersScreen → View order → OrderDetailsScreen → See OTP when arrived
8. **Profile** → ProfileScreen → Update location → Logout

### DELIVERY PARTNER Flow: Order Delivery

1. **Login** → LoginScreen → Email OTP → Verify → AppLayout (DeliveryBottomTabs)
2. **Assigned Orders** → AssignedOrdersScreen → View assigned orders → Order press → DeliveryOrderDetailsScreen
3. **Accept Order** → "Accept Order" button → `POST /api/delivery/orders/:id/accept` → Status: PICKED_UP
4. **Update Status** → "Out for Delivery" → `POST /api/delivery/orders/:id/status` → Status: OUT_FOR_DELIVERY
5. **Arrive** → "Arrived at Location" → `POST /api/delivery/orders/:id/status` → Status: ARRIVED_AT_LOCATION
6. **Verify OTP** → "Verify OTP" button → OTPVerificationScreen → Enter OTP → `POST /api/delivery/orders/:id/verify-otp` → Status: DELIVERED
7. **History** → OrderHistoryScreen → View delivered orders
8. **Profile** → ProfileScreen → Update location → Logout

---

## 🔌 API Endpoints Used

### Authentication
- `POST /api/auth/send-email-otp` - Send OTP to email
- `POST /api/auth/verify-email-otp` - Verify OTP and get JWT
- `POST /api/auth/verify-session` - Verify Supabase session (legacy)

### User APIs
- `GET /api/user/profile` - Get user profile
- `GET /api/user/categories` - Get all categories
- `GET /api/user/products` - Get products (with optional `categoryId` or `search` query)
- `GET /api/user/cart` - Get cart
- `POST /api/user/cart/items` - Add item to cart
- `PUT /api/user/cart/items/:id` - Update cart item quantity
- `POST /api/user/orders` - Place order
- `GET /api/user/orders` - Get user orders
- `GET /api/user/orders/:id` - Get order details
- `POST /api/user/location/update` - Update user location

### Delivery Partner APIs
- `GET /api/delivery/assigned-orders` - Get assigned orders
- `GET /api/delivery/delivery-history` - Get delivered orders
- `POST /api/delivery/orders/:id/accept` - Accept order
- `POST /api/delivery/orders/:id/status` - Update order status
- `POST /api/delivery/orders/:id/verify-otp` - Verify delivery OTP
- `POST /api/delivery/location/update` - Update delivery partner location

---

## 🔔 Realtime Architecture (Supabase)

### Channels
1. **`user_<userId>_orders`** - User order updates
   - Used in: OrderDetailsScreen
   - Event: `order_update`
   - Payload: `{ orderId, ... }`

2. **`delivery_<deliveryPartnerId>_orders`** - Delivery partner order updates
   - Used in: AssignedOrdersScreen, DeliveryOrderDetailsScreen
   - Event: `order_update`
   - Payload: `{ orderId, ... }`

3. **`admin_orders`** - Admin order updates (web dashboard only)
   - Used in: web/src/pages/Orders.jsx
   - Event: `order_update`

### Realtime Flow
1. Backend updates order → Calls `orderService.notifyOrderUpdate()`
2. Backend broadcasts to relevant channels via Supabase
3. Frontend receives event → Refetches data → Updates UI

### Subscription Pattern
```typescript
useEffect(() => {
  if (!token || !user?._id || !supabase) return;
  
  const channel = supabase.channel(`user_${user._id}_orders`);
  
  channel.on('broadcast', { event: 'order_update' }, (payload) => {
    if (payload?.payload?.orderId === orderId) {
      fetchOrderDetails(); // Refetch
    }
  });
  
  channel.subscribe();
  
  return () => {
    channel.unsubscribe(); // Cleanup
  };
}, [token, user?._id, orderId]);
```

---

## 🎨 UI Components

### AppHeader
- **Location:** `client/src/components/AppHeader.tsx`
- **Usage:** Fixed header in AppLayout
- **Displays:** Brand name, location (suburb/city), user name
- **Safe Area:** Uses `useSafeAreaInsets` for top padding

### ProductCard
- **Location:** `client/src/components/ProductCard.tsx`
- **Usage:** HomeScreen product carousels
- **Features:** Image, name, price, "Add to Cart" button, "View Details" link
- **API:** `POST /api/user/cart/items` on add to cart

### SearchItemCard
- **Location:** `client/src/components/SearchItemCard.tsx`
- **Usage:** ProductScreen product list
- **Features:** Image, name, description, price, "Add to Cart" button
- **API:** `POST /api/user/cart/items` on add to cart

### ManualCitySelector
- **Location:** `client/src/components/ManualCitySelector.tsx`
- **Usage:** HomeScreen (when location fails)
- **Features:** Manual city selection fallback

---

## 🗂️ State Management

### AuthContext
- **Provider:** Wraps entire app in RootNavigator
- **State:** `token`, `user`, `loading`
- **Methods:** `login()`, `logout()`
- **Persistence:** JWT in AsyncStorage

### LocationContext
- **Provider:** Wraps app (in RootNavigator or App.tsx)
- **State:** `location` (city, suburb, state, country, address, isManual)
- **Methods:** `setLocation()`
- **Persistence:** Last known city in AsyncStorage

---

## 🧭 Navigation Structure

### RootNavigator (Stack)
```
Login (if !token)
  ↓
App (if token)
  ├── ProductDetails (Stack - User)
  ├── OrderDetails (Stack - User)
  ├── DeliveryOrderDetails (Stack - Delivery Partner)
  └── OTPVerification (Stack - Delivery Partner)
```

### AppLayout
```
AppHeader (Fixed)
  ↓
BottomTabs (if USER)
  ├── Home
  ├── Products
  ├── Cart
  ├── Orders
  └── Profile
  ↓
DeliveryBottomTabs (if DELIVERY_PARTNER)
  ├── AssignedOrders
  ├── OrderHistory
  └── Profile
```

---

## 📦 Data Flow Examples

### Order Placement Flow
1. **CartScreen** → User clicks "Place Order"
2. Validates `LocationContext.location` exists
3. `POST /api/user/orders` with `{ paymentMethod: "COD" }`
4. Backend uses `req.user.location` as delivery address
5. Backend creates order → Broadcasts to Supabase
6. Frontend clears cart state
7. Navigate to OrdersScreen
8. OrdersScreen fetches orders → Shows new order

### Order Status Update Flow (Delivery)
1. **DeliveryOrderDetailsScreen** → Delivery partner clicks "Out for Delivery"
2. `POST /api/delivery/orders/:id/status` with `{ status: "OUT_FOR_DELIVERY" }`
3. Backend updates order → Broadcasts to Supabase channels:
   - `user_<userId>_orders` (user sees update)
   - `delivery_<deliveryPartnerId>_orders` (delivery partner sees update)
   - `admin_orders` (admin sees update)
4. Frontend receives realtime event → Refetches order details
5. UI updates automatically

---

## 🔒 Security & Authentication

### JWT Token Flow
1. Token stored in AsyncStorage (`AUTH_TOKEN`)
2. Axios interceptor adds `Authorization: Bearer <token>` to all requests
3. Backend validates token via `auth` middleware
4. On 401/403 → Token cleared → User redirected to Login

### Role-Based Access
- **USER:** Can access user APIs, user tabs
- **DELIVERY_PARTNER:** Can access delivery APIs, delivery tabs
- **ADMIN:** Web dashboard only (not in mobile app)

---

## 📱 Responsive Design

### Safe Area Implementation
- **AppLayout:** Uses `SafeAreaView` with `edges={['top']}`
- **AppHeader:** Uses `useSafeAreaInsets` for dynamic top padding
- **BottomTabs:** Uses `useSafeAreaInsets` for dynamic bottom padding
- **ProfileScreen:** Header uses safe area insets
- **CartScreen:** Footer uses safe area insets
- **DeliveryOrderDetailsScreen:** Header and ScrollView use safe area insets
- **ProductScreen:** Header uses safe area insets
- **ProductDetailsScreen:** ScrollView uses safe area insets

### Icon Rendering
- **Library:** `react-native-vector-icons`
- **Icons Used:** Ionicons (primary), MaterialIcons (legacy - Home tab)
- **Fix Applied:** Home tab now uses Ionicons "home-outline" with proper props

---

## 🎯 Key Features Summary

### User Features
✅ Email OTP authentication  
✅ GPS-based location detection  
✅ Manual city selection fallback  
✅ Category browsing  
✅ Product search  
✅ Shopping cart  
✅ Order placement (location-based)  
✅ Order tracking with realtime updates  
✅ Delivery OTP display  
✅ Order history  

### Delivery Partner Features
✅ Assigned orders list  
✅ Order acceptance  
✅ Status updates (Picked Up → Out for Delivery → Arrived)  
✅ OTP verification  
✅ Google Maps navigation  
✅ Order history (delivered orders)  
✅ Location updates  

### Realtime Features
✅ User order status updates  
✅ Delivery partner order updates  
✅ Admin dashboard order updates (web)  
✅ Automatic UI refresh on status changes  

---

## 🔧 Technical Stack

### Dependencies
- `react-native`: 0.83.1
- `@react-navigation/native`: 7.1.27
- `@react-navigation/bottom-tabs`: 7.9.1
- `@react-navigation/native-stack`: 7.9.1
- `@supabase/supabase-js`: 2.90.1
- `react-native-safe-area-context`: 5.6.2
- `react-native-vector-icons`: 10.3.0
- `axios`: 1.13.2
- `@react-native-async-storage/async-storage`: 2.2.0
- `react-native-geolocation-service`: 5.3.1
- `react-native-url-polyfill`: 3.0.0

---

## 📊 Screen Summary Table

| Screen | Route | Role | APIs | Realtime | Safe Area |
|--------|-------|------|------|----------|-----------|
| LoginScreen | Login | - | auth/send-otp, auth/verify-otp | ❌ | ❌ |
| HomeScreen | Home (Tab) | USER | user/categories, user/products, location/update | ❌ | ✅ |
| ProductScreen | Products (Tab/Stack) | USER | user/products | ❌ | ✅ |
| ProductDetailsScreen | ProductDetails (Stack) | USER | - | ❌ | ✅ |
| CartScreen | Cart (Tab) | USER | user/cart, user/cart/items/:id, user/orders | ❌ | ✅ |
| OrdersScreen | Orders (Tab) | USER | user/orders | ❌ | ❌ |
| OrderDetailsScreen | OrderDetails (Stack) | USER | user/orders/:id | ✅ | ❌ |
| ProfileScreen | Profile (Tab) | Both | location/update | ❌ | ✅ |
| AssignedOrdersScreen | AssignedOrders (Tab) | DELIVERY_PARTNER | delivery/assigned-orders | ✅ | ❌ |
| DeliveryOrderDetailsScreen | DeliveryOrderDetails (Stack) | DELIVERY_PARTNER | delivery/assigned-orders, delivery/orders/:id/* | ✅ | ✅ |
| OTPVerificationScreen | OTPVerification (Stack) | DELIVERY_PARTNER | delivery/orders/:id/verify-otp | ❌ | ❌ |
| OrderHistoryScreen | OrderHistory (Tab) | DELIVERY_PARTNER | delivery/delivery-history | ❌ | ❌ |

---

## 🚀 Performance Optimizations

1. **Debounced Search:** ProductScreen search has 500ms debounce
2. **Realtime Subscriptions:** Properly cleaned up on unmount
3. **Lazy Loading:** Categories and products loaded on demand
4. **Image Fallbacks:** Placeholder images for missing product images
5. **Safe Area Caching:** Safe area insets calculated once per screen

---

## 🐛 Known Limitations

1. **No Offline Support:** App requires network connection
2. **No Image Caching:** Product images not cached locally
3. **No Push Notifications:** Realtime only works when app is open
4. **No Order Cancellation:** Users cannot cancel orders from app
5. **No Payment Gateway:** Only COD (Cash on Delivery) supported

---

## 📝 Notes

- All API calls use axios with JWT token interceptor
- Location updates are role-aware (different endpoints for USER vs DELIVERY_PARTNER)
- Order placement uses location from LocationContext (not addressId)
- Realtime subscriptions are scoped per user/delivery partner
- Safe area insets ensure UI doesn't get cropped on notched devices
- All screens use TypeScript for type safety

---

**Document Generated:** Complete audit of React Native food delivery app  
**Last Updated:** After DeliveryOrderDetailsScreen safe area fix
