import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { AppVersionBadgeComponent } from '../../components/app-version-badge/app-version-badge.component';

@Component({
  selector: 'app-header',
  templateUrl: './app-header.component.html',
  styleUrls: ['./app-header.component.scss'],
  imports: [IonicModule, AppVersionBadgeComponent],
})
export class AppHeaderComponent {
  @Input({ required: true }) title!: string;
  @Input() showBack = true;
  @Input() defaultHref = '/main';
}
