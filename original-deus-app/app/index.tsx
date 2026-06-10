import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export default function Index() {
  const { currentUser } = useAuthStore();
  return <Redirect href={currentUser ? '/tabs/home' : '/auth/login'} />;
}
