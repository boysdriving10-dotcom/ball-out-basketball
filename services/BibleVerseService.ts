import AsyncStorage from '@react-native-async-storage/async-storage';

export interface BibleVerse {
  text: string;
  reference: string;
  date: string;
}

class BibleVerseService {
  private static instance: BibleVerseService;
  private readonly STORAGE_KEY = 'daily_bible_verse';

  // Inspirational Bible verses for athletes and team building
  private verses: BibleVerse[] = [
    {
      text: "I can do all things through Christ who strengthens me.",
      reference: "Philippians 4:13",
      date: ""
    },
    {
      text: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.",
      reference: "Isaiah 40:31",
      date: ""
    },
    {
      text: "Therefore encourage one another and build each other up, just as in fact you are doing.",
      reference: "1 Thessalonians 5:11",
      date: ""
    },
    {
      text: "As iron sharpens iron, so one person sharpens another.",
      reference: "Proverbs 27:17",
      date: ""
    },
    {
      text: "Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.",
      reference: "Colossians 3:23",
      date: ""
    },
    {
      text: "In their hearts humans plan their course, but the Lord establishes their steps.",
      reference: "Proverbs 16:9",
      date: ""
    },
    {
      text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.",
      reference: "Joshua 1:9",
      date: ""
    },
    {
      text: "Two are better than one, because they have a good return for their labor: If either of them falls down, one can help the other up.",
      reference: "Ecclesiastes 4:9-10",
      date: ""
    },
    {
      text: "The plans of the diligent lead to profit as surely as haste leads to poverty.",
      reference: "Proverbs 21:5",
      date: ""
    },
    {
      text: "For physical training is of some value, but godliness has value for all things, holding promise for both the present life and the life to come.",
      reference: "1 Timothy 4:8",
      date: ""
    },
    {
      text: "Do you not know that in a race all the runners run, but only one gets the prize? Run in such a way as to get the prize.",
      reference: "1 Corinthians 9:24",
      date: ""
    },
    {
      text: "Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.",
      reference: "Galatians 6:9",
      date: ""
    },
    {
      text: "Above all else, guard your heart, for everything you do flows from it.",
      reference: "Proverbs 4:23",
      date: ""
    },
    {
      text: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.",
      reference: "Proverbs 3:5-6",
      date: ""
    },
    {
      text: "The name of the Lord is a fortified tower; the righteous run to it and are safe.",
      reference: "Proverbs 18:10",
      date: ""
    }
  ];

  static getInstance(): BibleVerseService {
    if (!BibleVerseService.instance) {
      BibleVerseService.instance = new BibleVerseService();
    }
    return BibleVerseService.instance;
  }

  private getTodayDateString(): string {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  private getVerseForDate(dateString: string): BibleVerse {
    // Use date as seed for consistent daily verse
    const dayOfYear = this.getDayOfYear(new Date(dateString));
    const verseIndex = dayOfYear % this.verses.length;

    return {
      ...this.verses[verseIndex],
      date: dateString
    };
  }

  private getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  async getTodaysVerse(): Promise<BibleVerse> {
    const today = this.getTodayDateString();

    try {
      // Check if we have today's verse cached
      const cachedVerse = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (cachedVerse) {
        const parsed: BibleVerse = JSON.parse(cachedVerse);
        if (parsed.date === today) {
          return parsed;
        }
      }

      // Get new verse for today
      const todaysVerse = this.getVerseForDate(today);

      // Cache it
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(todaysVerse));

      return todaysVerse;
    } catch (error) {
      console.log('Error getting daily verse:', error);
      // Return fallback verse
      return this.getVerseForDate(today);
    }
  }

  async getVerseForSpecificDate(date: Date): Promise<BibleVerse> {
    const dateString = date.toISOString().split('T')[0];
    return this.getVerseForDate(dateString);
  }
}

// Create and export singleton instance
const bibleVerseService = BibleVerseService.getInstance();
export default bibleVerseService;