import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CounterstrafeComponent } from './pages/counterstrafe/counterstrafe.component';
import { HomeComponent } from './pages/home/home.component';

export const routes: Routes = [
  {path:'',component:HomeComponent},
  { path: 'counter-strafe', component: CounterstrafeComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }