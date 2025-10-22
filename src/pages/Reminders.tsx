import React from 'react';
import { useTranslation } from 'react-i18next';
import { useReminders } from '../contexts/ReminderContext';
import { Check, Clock } from 'lucide-react';

function Reminders() {
  const { t } = useTranslation();
  const { reminders, markReminderAsComplete, loading } = useReminders();

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-8 max-w-4xl mx-auto">
      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 md:mb-8">{t('reminders.title')}</h2>

      {reminders.length === 0 ? (
        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 text-center">
          <Clock size={40} className="sm:w-12 sm:h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 text-sm sm:text-base">{t('reminders.noReminders')}</p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {[...reminders]
            .sort((a, b) => Number(a.completed) - Number(b.completed)) // Невыполненные сверху
            .map((reminder) => (
              <div
                key={reminder.id}
                className={`bg-white rounded-lg shadow-lg p-6 ${
                  reminder.completed ? 'opacity-50' : ''
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 space-y-3 sm:space-y-0">
                  <div className="flex-1">
                    <p className="text-base sm:text-lg font-medium mb-2 pr-2">{reminder.reminder_text}</p>
                    <p className="text-xs sm:text-sm text-gray-500">
                      {t('reminders.scheduledFor')}: {formatDate(reminder.scheduled_for)}
                    </p>
                  </div>
                  {!reminder.completed && (
                    <button
                      onClick={() => markReminderAsComplete(reminder.id)}
                      className="self-start sm:ml-4 p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors flex-shrink-0"
                      title={t('reminders.markComplete')}
                    >
                      <Check size={18} className="sm:w-5 sm:h-5" />
                    </button>
                  )}
                </div>
                {reminder.diagnosis_text && (
                  <div className="mt-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2 text-sm sm:text-base">{t('reminders.diagnosis')}:</h4>
                    <p className="text-xs sm:text-sm text-gray-600">{reminder.diagnosis_text}</p>
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export default Reminders;