import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class FastHandsService {
  private supabaseConnection;
  constructor(){
    this.supabaseConnection = createClient(process.env.supabaseUrl,process.env.supabaseKey)
  }
}
