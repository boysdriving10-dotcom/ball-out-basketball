
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

interface Review {
  id: string;
  gameId: string;
  reviewerId: string;
  reviewedUserId: string;
  rating: number; // 1-5 stars
  comment?: string;
  categories: {
    skillLevel: number;
    teamwork: number;
    sportsmanship: number;
    punctuality: number;
  };
  createdAt: string;
  isAnonymous: boolean;
}

interface UserReputation {
  userId: string;
  totalReviews: number;
  averageRating: number;
  categoryAverages: {
    skillLevel: number;
    teamwork: number;
    sportsmanship: number;
    punctuality: number;
  };
  reviews: Review[];
}

interface ReputationContextType {
  getUserReputation: (userId: string) => Promise<UserReputation | null>;
  submitReview: (review: Omit<Review, 'id' | 'createdAt'>) => Promise<boolean>;
  getGameParticipants: (gameId: string) => Promise<string[]>;
  hasUserReviewedPlayer: (gameId: string, reviewedUserId: string) => Promise<boolean>;
  getAllReputations: () => Promise<UserReputation[]>;
}

const ReputationContext = createContext<ReputationContextType | undefined>(undefined);

const REVIEWS_STORAGE_KEY = 'basketball_app_reviews';
const REPUTATION_STORAGE_KEY = 'basketball_app_reputations';

export function ReputationProvider({ children }: { children: ReactNode }) {
  const getReviews = async (): Promise<Review[]> => {
    try {
      const reviewsData = await AsyncStorage.getItem(REVIEWS_STORAGE_KEY);
      return reviewsData ? JSON.parse(reviewsData) : [];
    } catch (error) {
      console.error('Error getting reviews:', error);
      return [];
    }
  };

  const saveReviews = async (reviews: Review[]) => {
    try {
      await AsyncStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(reviews));
    } catch (error) {
      console.error('Error saving reviews:', error);
    }
  };

  const calculateUserReputation = (userId: string, reviews: Review[]): UserReputation => {
    const userReviews = reviews.filter(review => review.reviewedUserId === userId);
    
    if (userReviews.length === 0) {
      return {
        userId,
        totalReviews: 0,
        averageRating: 0,
        categoryAverages: {
          skillLevel: 0,
          teamwork: 0,
          sportsmanship: 0,
          punctuality: 0,
        },
        reviews: [],
      };
    }

    const totalRating = userReviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / userReviews.length;

    const categoryAverages = {
      skillLevel: userReviews.reduce((sum, review) => sum + review.categories.skillLevel, 0) / userReviews.length,
      teamwork: userReviews.reduce((sum, review) => sum + review.categories.teamwork, 0) / userReviews.length,
      sportsmanship: userReviews.reduce((sum, review) => sum + review.categories.sportsmanship, 0) / userReviews.length,
      punctuality: userReviews.reduce((sum, review) => sum + review.categories.punctuality, 0) / userReviews.length,
    };

    return {
      userId,
      totalReviews: userReviews.length,
      averageRating: Math.round(averageRating * 10) / 10,
      categoryAverages: {
        skillLevel: Math.round(categoryAverages.skillLevel * 10) / 10,
        teamwork: Math.round(categoryAverages.teamwork * 10) / 10,
        sportsmanship: Math.round(categoryAverages.sportsmanship * 10) / 10,
        punctuality: Math.round(categoryAverages.punctuality * 10) / 10,
      },
      reviews: userReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    };
  };

  const getUserReputation = async (userId: string): Promise<UserReputation | null> => {
    try {
      const reviews = await getReviews();
      return calculateUserReputation(userId, reviews);
    } catch (error) {
      console.error('Error getting user reputation:', error);
      return null;
    }
  };

  const submitReview = async (reviewData: Omit<Review, 'id' | 'createdAt'>): Promise<boolean> => {
    try {
      const reviews = await getReviews();
      
      // Check if user already reviewed this player for this game
      const existingReview = reviews.find(
        review => 
          review.gameId === reviewData.gameId && 
          review.reviewerId === reviewData.reviewerId &&
          review.reviewedUserId === reviewData.reviewedUserId
      );

      if (existingReview) {
        console.log('User has already reviewed this player for this game');
        return false;
      }

      const newReview: Review = {
        ...reviewData,
        id: await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          reviewData.reviewerId + reviewData.reviewedUserId + reviewData.gameId + Date.now().toString()
        ),
        createdAt: new Date().toISOString(),
      };

      reviews.push(newReview);
      await saveReviews(reviews);

      return true;
    } catch (error) {
      console.error('Error submitting review:', error);
      return false;
    }
  };

  const getGameParticipants = async (gameId: string): Promise<string[]> => {
    // This would typically come from your game data
    // For now, returning mock data - you should integrate with your actual game system
    return [];
  };

  const hasUserReviewedPlayer = async (gameId: string, reviewedUserId: string): Promise<boolean> => {
    try {
      const reviews = await getReviews();
      // You'll need to get the current user ID from your auth context
      return reviews.some(
        review => 
          review.gameId === gameId && 
          review.reviewedUserId === reviewedUserId
      );
    } catch (error) {
      console.error('Error checking if user reviewed player:', error);
      return false;
    }
  };

  const getAllReputations = async (): Promise<UserReputation[]> => {
    try {
      const reviews = await getReviews();
      const userIds = [...new Set(reviews.map(review => review.reviewedUserId))];
      
      return userIds.map(userId => calculateUserReputation(userId, reviews));
    } catch (error) {
      console.error('Error getting all reputations:', error);
      return [];
    }
  };

  return (
    <ReputationContext.Provider value={{
      getUserReputation,
      submitReview,
      getGameParticipants,
      hasUserReviewedPlayer,
      getAllReputations,
    }}>
      {children}
    </ReputationContext.Provider>
  );
}

export function useReputation() {
  const context = useContext(ReputationContext);
  if (context === undefined) {
    throw new Error('useReputation must be used within a ReputationProvider');
  }
  return context;
}
