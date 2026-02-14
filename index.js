/**
 * @format
 */

import {AppRegistry, Image} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

import { PluginManager } from 'sn-plugin-lib';

AppRegistry.registerComponent(appName, () => App);

PluginManager.init();

PluginManager.registerButton(1, ['NOTE'], {
  id: 100,
  name: 'Insert Image',
  icon: Image.resolveAssetSource(
    require('./assets/insert_image.png'),
  ).uri,
  showType: 1,
});
