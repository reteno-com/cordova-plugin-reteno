import { Component, OnInit, inject } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AppHeaderComponent } from '../shared/app-header/app-header.component';
import { AppVersionBadgeComponent } from '../components/app-version-badge/app-version-badge.component';
import { RetenoService } from '../services/reteno.service';

type RecommendationView = {
  key: string;
  productId: string;
  raw: Record<string, unknown>;
};

@Component({
  selector: 'app-recommendations',
  templateUrl: 'recommendations.page.html',
  styleUrls: ['recommendations.page.scss'],
  imports: [IonicModule, ReactiveFormsModule, JsonPipe, AppHeaderComponent, AppVersionBadgeComponent],
})
export class RecommendationsPage implements OnInit {
  status: string | null = null;
  logStatus: string | null = null;
  recommendations: RecommendationView[] = [];

  private readonly formBuilder = inject(FormBuilder);
  private readonly reteno = inject(RetenoService);

  form = this.formBuilder.group({
    recomVariantId: this.formBuilder.control<string>('demo_recom_variant', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    productIds: this.formBuilder.control<string>(''),
    categoryId: this.formBuilder.control<string>(''),
    fields: this.formBuilder.control<string>(''),
    filterName: this.formBuilder.control<string>(''),
    filterValues: this.formBuilder.control<string>(''),
    logEventType: this.formBuilder.control<string>('IMPRESSIONS', {
      nonNullable: true,
    }),
    logProductId: this.formBuilder.control<string>(''),
    logOccurred: this.formBuilder.control<string>(new Date().toISOString(), {
      nonNullable: true,
    }),
  });

  ngOnInit(): void {}

  // Screen view is tracked globally in AppComponent.

  fetchRecommendations() {
    const v = this.form.getRawValue();
    const recomVariantId = this.clean(v.recomVariantId);
    if (!recomVariantId) {
      this.status = 'Please provide recomVariantId.';
      return;
    }

    const payload: {
      recomVariantId: string;
      productIds?: string[];
      categoryId?: string;
      fields?: string[];
      filters?: { name: string; values: string[] } | Array<{ name: string; values: string[] }>;
    } = { recomVariantId };

    const productIds = this.parseCsv(v.productIds);
    if (productIds.length) {
      payload.productIds = productIds;
    }

    const categoryId = this.clean(v.categoryId);
    if (categoryId) {
      payload.categoryId = categoryId;
    }

    const fields = this.parseCsv(v.fields);
    if (fields.length) {
      payload.fields = fields;
    }

    const filterName = this.clean(v.filterName);
    const filterValues = this.parseCsv(v.filterValues);
    if (filterName && filterValues.length) {
      payload.filters = { name: filterName, values: filterValues };
    }

    this.status = 'Fetching recommendations...';
    this.reteno
      .getRecommendations(payload)
      .then((result) => {
        const recoms =
          result && typeof result === 'object' && 'recoms' in result
            ? (result as { recoms?: unknown[] }).recoms
            : [];
        this.recommendations = Array.isArray(recoms)
          ? recoms.map((item, index) => this.buildRecommendationView(item, index))
          : [];
        this.status = `getRecommendations: OK (${this.recommendations.length} items)`;
        if (!this.form.controls.logProductId.value && this.recommendations.length) {
          this.form.controls.logProductId.setValue(this.recommendations[0].productId);
        }
      })
      .catch((err) => {
        this.status = 'getRecommendations: ERROR (see console)';
        // eslint-disable-next-line no-console
        console.error('getRecommendations: ERROR', err);
      });
  }

  logRecommendations() {
    const v = this.form.getRawValue();
    const recomVariantId = this.clean(v.recomVariantId);
    if (!recomVariantId) {
      this.logStatus = 'Please provide recomVariantId.';
      return;
    }

    const productId = this.clean(v.logProductId);
    if (!productId) {
      this.logStatus = 'Please provide productId.';
      return;
    }

    const recomEventType = this.clean(v.logEventType) ?? 'IMPRESSIONS';
    const occurred = this.clean(v.logOccurred) ?? new Date().toISOString();
    if (!v.logOccurred) {
      this.form.controls.logOccurred.setValue(occurred);
    }

    this.logStatus = 'Logging recommendation event...';
    this.reteno
      .logRecommendations({
        recomVariantId,
        recomEvents: [
          {
            recomEventType,
            occurred,
            productId,
          },
        ],
      })
      .then(() => {
        this.logStatus = 'logRecommendations: OK';
      })
      .catch((err) => {
        this.logStatus = 'logRecommendations: ERROR (see console)';
        // eslint-disable-next-line no-console
        console.error('logRecommendations: ERROR', err);
      });
  }

  selectProductId(productId: string) {
    this.form.controls.logProductId.setValue(productId);
  }

  private parseCsv(value: string | null | undefined): string[] {
    if (!value) {
      return [];
    }
    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private clean(value: string | null | undefined): string | null {
    if (value == null) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private buildRecommendationView(item: unknown, index: number): RecommendationView {
    const data = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    const productId = data['productId'] != null ? String(data['productId']) : `product-${index + 1}`;
    return {
      key: `${productId}:${index}`,
      productId,
      raw: data,
    };
  }
}
