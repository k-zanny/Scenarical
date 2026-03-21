import { Metadata } from 'next';
import FeedbackAdmin from './FeedbackAdmin';

export const metadata: Metadata = {
  title: 'Feedback Admin — Scenarical',
  robots: 'noindex, nofollow',
};

export default function FeedbackPage() {
  return <FeedbackAdmin />;
}
