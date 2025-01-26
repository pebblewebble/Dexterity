import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
// import { AppComponent } from './app/app.component';
import { CounterstrafeComponent } from './app/pages/counterstrafe/counterstrafe.component';

// bootstrapApplication(AppComponent, appConfig)
//   .catch((err) => console.error(err));

bootstrapApplication(CounterstrafeComponent).catch((err)=>console.error(err));
