import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-header',
  templateUrl: './app-header.component.html',
  styleUrls: ['./app-header.component.scss'],
  imports: [IonicModule],
})
export class AppHeaderComponent {
  @Input({ required: true }) title!: string;
  @Input() showBack = true;
  @Input() defaultHref = '/main';
  version = environment.appVersion;
}
