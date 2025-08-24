// Simple DB helper that reuses the existing Mongo connection utility
// Kept separate to satisfy feature-specific imports without changing existing code
export { connectToDatabase } from './mongodb';
