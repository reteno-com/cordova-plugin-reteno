import { Component, OnInit, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { RetenoService } from '../services/reteno.service';

@Component({
  selector: 'app-main',
  templateUrl: 'main.page.html',
  styleUrls: ['main.page.scss'],
  imports: [IonicModule, RouterModule],
})
export class MainPage implements OnInit {
  private readonly reteno = inject(RetenoService);

  ngOnInit(): void {
    this.reteno.requestNotificationPermission().catch(() => {});
  }

  ionViewDidEnter(): void {
    this.reteno.logScreenView('Home').catch(() => {});
  }
}
