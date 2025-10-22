import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Star, X } from 'lucide-react';

// --- ИЗМЕНЕНИЕ: Компонент AuthModal теперь определен снаружи ---
// Он принимает все необходимые функции и состояния как пропсы.
const AuthModal = ({ 
  isSignUpMode, 
  onClose, 
  onModeChange 
}: { 
  isSignUpMode: boolean, 
  onClose: () => void, 
  onModeChange: () => void 
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignUpMode) {
        const { error: signUpError } = await signUp(email, password);
        if (signUpError) throw signUpError;
        setShowConfirmation(true);
      } else {
        const { error: signInError } = await signIn(email, password);
        if (signInError) throw signInError;
      }
    } catch (error: any) {
      if (error.message.includes('Email not confirmed')) {
        setShowConfirmation(true);
      } else {
        setError('Неверный email или пароль.');
      }
      console.error('Authentication error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const ConfirmationMessage = () => (
    <div className="text-center p-4 bg-blue-50 rounded-xl mb-4">
      <h3 className="font-bold text-blue-900 mb-2">Подтвердите ваш email</h3>
      <p className="text-blue-800 mb-4">
        Мы отправили письмо с подтверждением на <span className="font-semibold">{email}</span>.<br />
        Пожалуйста, проверьте вашу почту и перейдите по ссылке.
      </p>
      <p className="text-sm text-blue-700">
        Не получили письмо? Проверьте папку "Спам".
      </p>
    </div>
  );

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity duration-300"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl p-8 max-w-md w-full m-4 transform transition-all duration-300 scale-95 opacity-0 animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-1 text-gray-800">
          {isSignUpMode ? 'Создание аккаунта' : 'Вход в аккаунт'}
        </h2>
        <p className="text-gray-500 mb-6">
          {isSignUpMode ? 'Заполните поля для начала работы' : 'Рады видеть вас снова!'}
        </p>
        {showConfirmation ? <ConfirmationMessage /> : (
          <form onSubmit={handleSubmit}>
            {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-xl text-sm">{error}</div>}
            <div className="mb-4">
              <label className="block text-gray-700 mb-2 font-medium">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500" required />
            </div>
            <div className="mb-6">
              <label className="block text-gray-700 mb-2 font-medium">Пароль</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500" required />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 transition-all shadow-lg disabled:opacity-50">
              {loading ? 'Загрузка...' : (isSignUpMode ? 'Создать аккаунт' : 'Войти')}
            </button>
          </form>
        )}
        {!showConfirmation && (
          <p className="mt-6 text-center text-sm">
            {isSignUpMode ? 'Уже есть аккаунт?' : 'Ещё нет аккаунта?'}{' '}
            <button type="button" className="text-green-600 hover:underline font-semibold" onClick={onModeChange}>
              {isSignUpMode ? 'Войти' : 'Зарегистрироваться'}
            </button>
          </p>
        )}
        <button type="button" className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors" onClick={onClose}>
          <X size={24} />
        </button>
      </div>
    </div>
  );
};


function LandingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="relative min-h-screen bg-gray-900">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: 'brightness(0.5)' }}
      >
        <source src="https://cdn.pixabay.com/video/2025/04/20/273176.mp4" type="video/mp4" />
      </video>

      <div className="relative z-10 min-h-screen">
        <div className="flex flex-col items-center justify-center min-h-screen text-white px-4 text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in-down">EgisEye</h1>
          <p className="text-lg md:text-xl mb-8 max-w-2xl animate-fade-in-up">
            Автоматическая диагностика заболеваний растений и деревьев с использованием передовых технологий искусственного интеллекта.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full transition duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 animate-fade-in-up"
            style={{ animationDelay: '0.5s' }}
          >
            Начать работу
          </button>
        </div>

        <div className="bg-white py-20 px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-800">Отзывы пользователей</h2>
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: "Канат Мастерок Мусатаев", role: "Поставщик зеленого лука", text: "Энактус Маргулан помогли нашему бизнесу повысить доход путем сохранения нашего урожая. Это был хороший опыт и новые знания. Надеемся на дальнейшее сотрудничество!", avatar: "/images/Qanat.jpeg" },
              { name: "Михаил Чен", role: "Профессиональный ботаник", text: "Незаменимый инструмент для быстрой диагностики заболеваний. Рекомендую!", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop" },
              { name: "Елена Давыдова", role: "Городской фермер", text: "Диагностика в реальном времени изменила наш подход к мониторингу теплицы.", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop" }
            ].map((testimonial, index) => (
              <div key={index} className="bg-gray-50 p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300">
                <div className="flex items-center mb-4"><img src={testimonial.avatar} alt={testimonial.name} className="w-12 h-12 rounded-full mr-4 object-cover" />
                  <div><h3 className="font-bold text-gray-900">{testimonial.name}</h3><p className="text-gray-600 text-sm">{testimonial.role}</p></div>
                </div>
                <p className="text-gray-700 mb-4">{testimonial.text}</p>
                <div className="flex text-yellow-400">{[...Array(5)].map((_, i) => (<Star key={i} size={20} fill="currentColor" />))}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* ИЗМЕНЕНИЕ: Теперь мы вызываем AuthModal как обычный компонент */}
      {isModalOpen && <AuthModal 
        isSignUpMode={isSignUpMode}
        onClose={() => setIsModalOpen(false)}
        onModeChange={() => setIsSignUpMode(!isSignUpMode)}
      />}
    </div>
  );
}

export default LandingPage;