import { Component, computed, inject, signal } from '@angular/core';
import { LinguiService, TSelectPipe } from '@tocdk/lingui-angular';
import { DemoPageComponent } from '../shared/demo-page.component';

const STATUS_LABELS: Record<string, string> & { other: string } = {
  active: 'Online',
  away: 'Idle',
  other: 'Offline',
};

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [DemoPageComponent, TSelectPipe],
  template: `
    <app-demo-page title="select">
      <div rendered>
        <p>
          <label>Status:
            <select #s (change)="status.set(s.value)">
              <option value="active">active</option>
              <option value="away">away</option>
              <option value="offline">offline</option>
            </select>
          </label>
        </p>
        <p>i18n runtime select: <strong>{{ selectTs() }}</strong></p>
        <p>| tSelect pipe: <strong>{{ status() | tSelect: { active: 'Online', away: 'Idle', other: 'Offline' } }}</strong></p>
      </div>
    </app-demo-page>
  `,
})
export default class SelectComponent {
  private readonly lingui = inject(LinguiService);
  protected status = signal('active');
  protected selectTs = computed(() => {
    this.lingui.locale(); // reactive dependency
    const v = this.status();
    return Object.prototype.hasOwnProperty.call(STATUS_LABELS, v)
      ? STATUS_LABELS[v]
      : STATUS_LABELS.other;
  });
}
