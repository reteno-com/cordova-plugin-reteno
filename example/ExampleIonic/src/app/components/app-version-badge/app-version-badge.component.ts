import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { App } from '@capacitor/app';

@Component({
  selector: 'app-version-badge',
  standalone: true,
  imports: [IonicModule],
  template: '@if (label) {<ion-badge class="app-version" color="medium">{{ label }}</ion-badge>}',
  styles: [`
    .app-version {
      font-size: 11px;
      letter-spacing: 0.3px;
      text-transform: none;
    }
  `],
})
export class AppVersionBadgeComponent implements OnInit {
  label = '';

  async ngOnInit(): Promise<void> {
    try {
      const info = await App.getInfo();
      const version = (info.version ?? '').trim();
      const build = (info.build ?? '').trim();

      if (version && build) {
        this.label = `${version}(${build})`;
      } else {
        this.label = version;
      }
    } catch {
      this.label = '';
    }
  }
}
