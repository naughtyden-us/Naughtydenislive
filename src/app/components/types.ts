import { ReactNode } from "react";

export interface Creator {
  likes: number;
  id: number;
  name: string;
  rating: number;
  price: number;
  isAd: boolean;
  image: string;
  type: string;
  isVerified?: boolean;
  verificationStatus?: 'pending' | 'verified' | 'failed';
}
