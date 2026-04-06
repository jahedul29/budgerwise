'use client';
import { Mic } from 'lucide-react';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import toast from 'react-hot-toast';

// TODO: AI_VOICE_INTEGRATION
// Future implementation will use:
// - Web Speech API for speech-to-text
// - LLM API (Claude/GPT) to parse natural language like "Spent 500 taka on lunch today"
// - parseVoiceTransaction(transcript: string) utility to return partial Transaction

export interface ParsedVoiceTransaction {
  amount?: number;
  type?: 'income' | 'expense';
  categoryName?: string;
  description?: string;
  date?: Date;
}

// TODO: AI_VOICE_INTEGRATION - Implement this function
export function parseVoiceTransaction(_transcript: string): ParsedVoiceTransaction {
  return {};
}

export function VoiceInputButton() {
  const handlePress = () => {
    toast('Voice input coming soon!', { icon: '🎙️' });
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handlePress}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            <Mic className="h-5 w-5" />
          </motion.button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Voice Input — Coming Soon</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
