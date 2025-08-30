import LoginFooter from './components/LoginFooter';
import LoginForm from './components/LoginForm';
import LoginHeader from './components/LoginHeader';

export default function Login() {
  return (
    <div className='m-2'>
      <LoginHeader />
      <LoginForm />
      <LoginFooter />
    </div>
  );
}
