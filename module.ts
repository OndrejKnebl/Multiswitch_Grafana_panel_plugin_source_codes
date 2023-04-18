import { PanelPlugin } from '@grafana/data';
import { SimplePanel } from 'components/SimplePanel';
import { SimplePanelOptions } from './types';

export const plugin = new PanelPlugin<SimplePanelOptions>(SimplePanel).setNoPadding().setPanelOptions((builder) => {
});

// dependencies and creates a Grafana panel plugin called SimplePanel, exports the plugin for use within Grafana
