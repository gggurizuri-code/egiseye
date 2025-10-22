import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import { Camera, Upload, Send, Bell, Search, Microscope, X } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useAchievements } from '../contexts/AchievementsContext';
import { useReminders } from '../contexts/ReminderContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useTranslation } from 'react-i18next';
import { supabase } from '../supabaseClient';

// --- ИЗМЕНЕНИЕ: Инициализируем Gemini один раз и используем последнюю модель ---
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("VITE_GEMINI_API_KEY is not defined in .env");
}
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// --- ИЗМЕНЕНИЕ: Определяем разрешенные типы изображений ---
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_IMAGE_ACCEPT_STRING = ALLOWED_IMAGE_TYPES.join(', ');

// --- Остальная часть кода ---
type ScanType = 'identify' | 'diagnose';

interface DiagnosisSection {
  heading?: string;
  content: string[];
  recommendations?: { text: string; days: number }[];
}
interface DiagnosisResult {
  title?: string;
  sections: DiagnosisSection[];
}
interface IdentificationResult {
  name: string;
  variety?: string;
  origin?: string;
}

function Scanner() {
  const { user } = useAuth();
  const { checkAndIncrementUsage } = useSubscription();
  const { checkAndGrantAchievements } = useAchievements();
  const { createReminder } = useReminders();
  const { isSupported, permission, requestPermission } = useNotifications();
  const { t, i18n } = useTranslation();

  const [scanType, setScanType] = useState<ScanType>('identify');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUsingCamera, setIsUsingCamera] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plantIdentification, setPlantIdentification] = useState<IdentificationResult | null>(null);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [plantName, setPlantName] = useState<string>('');
  const [userProfile, setUserProfile] = useState<{ occupation?: string } | null>(null);
  
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.id) {
      supabase.from('users').select('occupation').eq('user_id', user.id).single()
        .then(({ data, error }) => {
          if (error && error.code !== 'PGRST116') throw error;
          setUserProfile(data);
        }).catch(err => console.error('Error fetching user profile:', err));
    }
  }, [user?.id]);

  useEffect(() => {
    if (plantIdentification?.name) {
      setPlantName(plantIdentification.name);
    }
  }, [plantIdentification]);

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const extractTimeRecommendations = (text: string): { text: string; days: number }[] => {
    const recommendations: { text: string; days: number }[] = [];
    const patterns = [
      { regex: /через\s*(\d+)\s*-\s*(\d+)\s*(дней|дня|день)/i, multiplier: 1 },
      { regex: /каждые\s*(\d+)\s*-\s*(\d+)\s*(дней|дня|день)/i, multiplier: 1 },
      { regex: /через\s*(\d+)\s*(дней|дня|день)/i, multiplier: 1 },
      { regex: /каждые\s*(\d+)\s*(дней|дня|день)/i, multiplier: 1 },
      { regex: /через\s*(\d+)\s*(недел[юий])/i, multiplier: 7 },
      { regex: /каждые\s*(\d+)\s*(недел[юий])/i, multiplier: 7 },
    ];
    text.split(/[.!?]/).forEach(sentence => {
      for (const { regex, multiplier } of patterns) {
        const match = sentence.match(regex);
        if (match) {
          const days = match[2] ? Math.round(((parseInt(match[1], 10) + parseInt(match[2], 10)) / 2) * multiplier) : parseInt(match[1], 10) * multiplier;
          recommendations.push({ text: sentence.trim(), days });
          return;
        }
      }
    });
    return recommendations;
  };

  const parseDiagnosisResponse = (text: string): DiagnosisResult => {
    const sections: DiagnosisSection[] = [];
    const blocks = text.split(/(?=\d+\.\s*)/).filter(block => block.trim());
    blocks.forEach(block => {
      const lines = block.split('\n').map(line => line.trim()).filter(Boolean);
      if (lines.length === 0) return;
      let heading: string | undefined;
      let content: string[] = [];
      const headingMatch = lines[0].match(/^\d+\.\s*([^:]+):?/);
      if (headingMatch) {
        heading = headingMatch[1].trim();
        const remainingText = lines[0].substring(headingMatch[0].length).trim();
        if (remainingText) content.push(remainingText);
        content.push(...lines.slice(1));
      } else {
        content = lines;
      }
      sections.push({ heading, content, recommendations: extractTimeRecommendations(block) });
    });
    return { title: t('scanner.results'), sections };
  };

  const handleFileSelected = (selectedFile: File | null) => {
    setError(null);
    if (!selectedFile) return;

    // ИЗМЕНЕНИЕ: Проверяем тип файла
    if (!ALLOWED_IMAGE_TYPES.includes(selectedFile.type)) {
      setError(t('scanner.fileTypeError'));
      return;
    }

    if (preview) URL.revokeObjectURL(preview);
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    handleFileSelected(e.dataTransfer.files[0]);
  };

  const captureImage = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        fetch(imageSrc).then(res => res.blob()).then(blob => {
          handleFileSelected(new File([blob], "captured-image.jpg", { type: "image/jpeg" }));
          setIsUsingCamera(false);
        });
      }
    }
  };
  
  const resetScan = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFile(null);
    setDiagnosis(null);
    setPlantIdentification(null);
    setError(null);
    if (scanType === 'identify') {
      setPlantName('');
    }
  };
  
  const handleCreateReminder = async (text: string, days: number, diagnosisText: string) => {
    if (!user) return;
    try {
      if (isSupported && permission !== 'granted') {
        const result = await requestPermission();
        if (result !== 'granted') {
          alert(t('scanner.notificationPermissionDenied'));
          return;
        }
      }
      await createReminder(text, diagnosisText, days);
      alert(t('scanner.reminderCreated'));
    } catch (error) {
      console.error('Error creating reminder:', error);
      alert(t('scanner.reminderError'));
    }
  };

  const analyzePlant = async () => {
    if (!file) return;

    const canUse = await checkAndIncrementUsage('scan');
    if (!canUse) {
      setError(t('scanner.usageLimitError'));
      return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    setDiagnosis(null);
    setPlantIdentification(null);

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (err) => reject(new Error("Не удалось прочитать файл."));
        reader.readAsDataURL(file);
      });

      const languageInstruction = `Твой ответ должен быть СТРОГО на языке: ${i18n.language === 'ru' ? 'Русский' : 'Казахский'}.`;
      const occupationInfo = userProfile?.occupation ? `Пользователь является специалистом: ${userProfile.occupation}. Учитывай это в терминологии.` : '';
      let prompt: string;

      if (scanType === 'identify') {
        prompt = `ТЫ — ЭКСПЕРТ-БОТАНИК. Идентифицируй растение на фото. ${languageInstruction} ${occupationInfo} НЕ ИСПОЛЬЗУЙ markdown. Ответ должен быть в четком формате:
Название: [название]
Сорт: [сорт/разновидность, если применимо]
Происхождение: [регион происхождения]`;
      } else {
        const plantInfo = plantName ? `Диагностика для растения: ${plantName}.` : '';
        prompt = `ТЫ — ЭКСПЕРТ-АГРОНОМ. Проанализируй фото и поставь диагноз. ${languageInstruction} ${plantInfo} ${occupationInfo} НЕ ИСПОЛЬЗУЙ markdown. Ответ строго по пунктам:
1. Диагноз: [краткое название болезни/проблемы]
2. Симптомы: [перечисление видимых признаков]
3. Причины: [возможные причины]
4. Лечение: [конкретные шаги с указанием временных интервалов, например "через 5-7 дней"]
5. Профилактика: [меры по предотвращению]`;
      }

      const result = await model.generateContent([prompt, { inlineData: { mimeType: file.type, data: base64Data } }]);
      const responseText = result.response.text();
      
      if (scanType === 'identify') {
        const nameMatch = responseText.match(/Название:\s*([^\n]+)/i);
        const varietyMatch = responseText.match(/Сорт:\s*([^\n]+)/i);
        const originMatch = responseText.match(/Происхождение:\s*([^\n]+)/i);
        setPlantIdentification({ name: nameMatch?.[1].trim() || t('scanner.unknownPlant'), variety: varietyMatch?.[1].trim(), origin: originMatch?.[1].trim() });
      } else {
        setDiagnosis(parseDiagnosisResponse(responseText));
      }
      
      // Записываем действие сканирования
      if (user?.id) {
        await supabase.from('user_actions').insert({
          user_id: user.id,
          action_type: 'plant_scanned',
          target_id: null
        });
      }
      
      await checkAndGrantAchievements();

    } catch (error) {
      console.error('Error analyzing image:', error);
      setError(error instanceof Error ? error.message : t('scanner.unknownError'));
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8">{t('scanner.title')}</h2>
      
      <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 mb-6">
        <div className="flex space-x-4 mb-6">
          <button type="button" onClick={() => { setScanType('identify'); resetScan(); }} className={`flex-1 flex items-center justify-center space-x-2 p-4 rounded-lg transition-colors ${scanType === 'identify' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}><Search size={24} /> <span>{t('scanner.identifyPlant')}</span></button>
          <button type="button" onClick={() => { setScanType('diagnose'); resetScan(); }} className={`flex-1 flex items-center justify-center space-x-2 p-4 rounded-lg transition-colors ${scanType === 'diagnose' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}><Microscope size={24} /> <span>{t('scanner.diagnoseDisease')}</span></button>
        </div>

        {scanType === 'diagnose' && (
          <div className="mb-4">
            <label htmlFor="plantName" className="block text-sm font-medium text-gray-700 mb-2">{t('scanner.plantNameLabel')}</label>
            <input type="text" id="plantName" value={plantName} onChange={(e) => setPlantName(e.target.value)} placeholder={t('scanner.plantNamePlaceholder')} className="w-full px-4 py-2 border border-gray-300 rounded-lg"/>
          </div>
        )}

        {!preview && !isUsingCamera && (
          <div
            className={`flex flex-col items-center justify-center space-y-4 p-12 border-2 border-dashed ${isDragging ? 'border-green-500 bg-green-50' : 'border-gray-300'} rounded-lg`}
            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={handleDrop}
          >
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
              <button type="button" onClick={() => setIsUsingCamera(true)} className="flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"><Camera size={20} /><span>{t('scanner.useCamera')}</span></button>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Upload size={20} /><span>{t('scanner.uploadImage')}</span></button>
              <input type="file" ref={fileInputRef} onChange={(e) => handleFileSelected(e.target.files?.[0] || null)} accept={ALLOWED_IMAGE_ACCEPT_STRING} className="hidden"/>
            </div>
            <p className="text-gray-500 text-center mt-4">{isDragging ? t('scanner.dropToUpload') : t('scanner.dragAndDrop')}</p>
          </div>
        )}

        {isUsingCamera && (
          <div className="relative"><Webcam ref={webcamRef} screenshotFormat="image/jpeg" className="w-full rounded-lg" videoConstraints={{ width: 1280, height: 720, facingMode: "environment" }}/>
            <button type="button" onClick={captureImage} className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 bg-green-600 text-white rounded-lg">{t('scanner.takePhoto')}</button>
          </div>
        )}

        {preview && (
          <div className="space-y-4">
            <img src={preview} alt={t('scanner.capturedPlant')} className="max-w-full h-64 object-contain mx-auto rounded-lg" />
            <div className="flex flex-col md:flex-row justify-between space-y-4 md:space-y-0">
              <button type="button" onClick={resetScan} className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700">{t('scanner.newPhoto')}</button>
              <button type="button" onClick={analyzePlant} disabled={isAnalyzing} className="flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                {isAnalyzing ? (<span>{t('scanner.analyzing')}</span>) : (<><Send size={20} /><span>{scanType === 'identify' ? t('scanner.identifyPlant') : t('scanner.analyze')}</span></>)}
              </button>
            </div>
          </div>
        )}
        
        {error && <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center justify-between"><span><strong>{t('common.error')}:</strong> {error}</span><button type='button' onClick={()=>setError(null)}><X size={20}/></button></div>}
      </div>

      {isAnalyzing && (
        <div className="flex justify-center items-center p-8"><div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div></div>
      )}

      {plantIdentification && !isAnalyzing && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-xl font-bold mb-4">{t('scanner.identificationResults')}</h3>
          <div className="space-y-4">
            <div><h4 className="font-semibold text-gray-700">{t('scanner.name')}:</h4><p className="text-lg">{plantIdentification.name}</p></div>
            {plantIdentification.variety && (<div><h4 className="font-semibold text-gray-700">{t('scanner.variety')}:</h4><p>{plantIdentification.variety}</p></div>)}
            {plantIdentification.origin && (<div><h4 className="font-semibold text-gray-700">{t('scanner.origin')}:</h4><p>{plantIdentification.origin}</p></div>)}
            <div className="pt-4">
              <button type="button" onClick={() => { setScanType('diagnose'); setDiagnosis(null); setError(null); }} className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700">
                {t('scanner.checkDiseases')}
              </button>
            </div>
          </div>
        </div>
      )}

      {diagnosis && !isAnalyzing && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold mb-6">{diagnosis.title}</h3>
          {plantName && (<p className="mb-4 text-gray-600"><strong>{t('scanner.plant')}:</strong> {plantName}</p>)}
          <div className="space-y-6">
            {diagnosis.sections.map((section, index) => (
              <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0">
                {section.heading && (<h4 className="text-lg font-semibold mb-2 text-green-700">{section.heading}</h4>)}
                <div className="space-y-2">
                  {section.content.map((line, lineIndex) => (<p key={lineIndex} className="text-gray-700">{line}</p>))}
                  {section.recommendations && section.recommendations.length > 0 && (
                    <div className="mt-4">
                      {section.recommendations.map((rec, recIndex) => (
                        <button type="button" key={recIndex} onClick={() => handleCreateReminder(rec.text, rec.days, section.content.join('\n'))} className="inline-flex items-center space-x-2 mt-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100">
                          <Bell size={16} /><span>{t('scanner.remindInDays', { count: rec.days })}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Scanner;