import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { IonicModule, Platform } from '@ionic/angular';
import { Subscription, filter } from 'rxjs';
import { RetenoService } from './services/reteno.service';

@Component({
    selector: 'app-root',
    templateUrl: 'app.component.html',
    styleUrls: ['app.component.scss'],
    imports: [IonicModule]
})
export class AppComponent {
  private readonly platform = inject(Platform);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly reteno = inject(RetenoService);

  private screenTrackingSub: Subscription | null = null;
  private lastLoggedScreen: string | null = null;

  ngOnInit(): void {
    this.platform.ready().then(() => {
      this.enableScreenTracking();
    });
  }

  ngOnDestroy(): void {
    this.screenTrackingSub?.unsubscribe();
    this.screenTrackingSub = null;
  }

  private enableScreenTracking(): void {
    this.screenTrackingSub?.unsubscribe();

    this.screenTrackingSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        const screenName = this.getRetenoScreenName(e.urlAfterRedirects);
        this.logScreenIfChanged(screenName);
      });

    // Log initial screen once, too.
    const initial = this.getRetenoScreenName(this.router.url);
    this.logScreenIfChanged(initial);
  }

  private logScreenIfChanged(screenName: string): void {
    if (!screenName || screenName === this.lastLoggedScreen) {
      return;
    }
    this.lastLoggedScreen = screenName;

    if (!this.reteno.isAvailable()) {
      return;
    }

    this.reteno.logScreenView(screenName).catch(() => {
      // ignore
    });
  }

  private getRetenoScreenName(fallbackUrl: string): string {
    let route: ActivatedRoute | null = this.activatedRoute;
    while (route?.firstChild) {
      route = route.firstChild;
    }

    const dataName = route?.snapshot?.data?.['retenoScreen'];
    if (typeof dataName === 'string' && dataName.trim().length > 0) {
      return dataName.trim();
    }

    const url = (fallbackUrl || '').split('#')[0].split('?')[0].trim();
    return url.length > 0 ? url : 'Unknown';
  }
}
