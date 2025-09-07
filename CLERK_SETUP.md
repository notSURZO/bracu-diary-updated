# Clerk Authentication Setup Guide

## 1. Create a Clerk Account

1. Go to [https://clerk.dev](https://clerk.dev)
2. Sign up for a free account
3. Create a new application for your BracU Diary project

## 2. Get Your API Keys

1. In your Clerk Dashboard, go to **API Keys**
2. Copy the **Publishable Key** (starts with `pk_test_`)
3. Copy the **Secret Key** (starts with `sk_test_`)

## 3. Create Environment Variables

Create a `.env.local` file in your project root and add:

```bash
# Clerk Authentication Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_secret_key_here

# Clerk URLs (optional - these are the defaults)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# MongoDB Connection (if you have one)
MONGODB_URI=your_mongodb_connection_string_here
```

## 4. Configure Clerk Settings

In your Clerk Dashboard:

1. **User Management** → **Email, Phone, Username**: Configure which fields are required
2. **User Management** → **Personal Information**: Enable name fields
3. **User Management** → **Social Connections**: Optional - enable OAuth providers
4. **Paths**: Set redirect URLs to match your environment variables

## 5. Test the Authentication

1. Run your development server: `npm run dev`
2. Visit `http://localhost:3000`
3. Try signing up and signing in
4. Check that you're redirected to `/dashboard` after authentication

## Features Implemented

✅ **Sign Up**: Users can create accounts with name, email, and password  
✅ **Sign In**: Secure authentication with session management  
✅ **Dashboard**: Protected route that shows personalized content  
✅ **User Profile**: Integrated with Clerk's UserButton component  
✅ **Route Protection**: Middleware protects authenticated routes  
✅ **Responsive Design**: Mobile-friendly authentication UI  

## Next Steps

- Integrate with MongoDB to store additional user data
- Add profile management features
- Implement course management functionality
- Add event registration system
- Integrate AI chatbot features

## Troubleshooting

- Make sure your environment variables are properly set
- Check that your Clerk application is configured correctly
- Verify that your domain is added to Clerk's allowed origins
- Check the browser console for any JavaScript errors 