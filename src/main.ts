import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { CounterstrafeComponent } from './app/pages/counterstrafe/counterstrafe.component';
import { HomeComponent } from './app/pages/home/home.component';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';

// bootstrapApplication(AppComponent, appConfig)
//   .catch((err) => console.error(err));

// bootstrapApplication(CounterstrafeComponent).catch((err)=>console.error(err));
bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes)]
});
