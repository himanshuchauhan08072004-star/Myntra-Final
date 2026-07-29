export interface Product {
  _id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  originalPrice?: number;
  discount?: string;
  rating: number;
  reviewCount: number;
  description: string;
  sizes: string[];
  images: string[];
  colors?: string[];
  stock: number;
}

export interface User {
  _id: string;
  fullName: string;
  email: string;
  theme: "light" | "dark" | "system";
}

export interface BagItem {
  _id: string;
  productId: Product;
  size: string;
  color?: string;
  quantity: number;
  priceCentsAtAdd?: number | null;
  priceChanged?: boolean;
  currentPriceCents?: number;
}

export interface SavedItem {
  _id: string;
  productId: Product;
  size: string;
  color?: string;
  quantity: number;
}

export interface WishlistItem {
  _id: string;
  productId: Product;
}

export interface OrderItem {
  productId: string;
  productName: string;
  productImage?: string;
  size?: string;
  color?: string;
  unitPriceCents: number;
  quantity: number;
}

export interface StatusHistoryEntry {
  status: string;
  note?: string;
  occurredAt: string;
}

export interface Order {
  _id: string;
  invoiceNumber: string;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "returned" | "refunded";
  paymentMethod: string;
  currency: string;
  subtotalCents: number;
  taxCents: number;
  shippingCents: number;
  totalCents: number;
  shippingAddress: string;
  items: OrderItem[];
  statusHistory: StatusHistoryEntry[];
  placedAt: string;
}

export interface Notification {
  _id: string;
  category: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationPreferences {
  orderConfirmation: boolean;
  paymentUpdates: boolean;
  shippingUpdates: boolean;
  deliveryStatus: boolean;
  wishlistPriceDrop: boolean;
  backInStock: boolean;
  promotional: boolean;
  abandonedCart: boolean;
}

export interface Review {
  _id: string;
  userId: { _id: string; fullName: string };
  productId: string;
  rating: number;
  title?: string;
  comment?: string;
  verifiedPurchase: boolean;
  helpfulVotes: number;
  createdAt: string;
}

export interface RecommendedProduct extends Product {
  reason: string;
}
