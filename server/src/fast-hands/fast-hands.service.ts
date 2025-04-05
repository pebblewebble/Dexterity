import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class FastHandsService {
  private supabaseConnection;
  constructor() {
    this.supabaseConnection = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)
  }

  async saveScore(data:JSON) {
    try {
      const { data: insertedData, error } = await this.supabaseConnection
        .from('fast_hands_leaderboard')
        .insert(data)

      if(error){
        throw error;
      }
      return insertedData
    } catch (error) {
      console.error("Error saving score to leaderboard:", error)
      throw error;
    }
  }
}
