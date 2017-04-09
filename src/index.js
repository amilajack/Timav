import React, { Component } from 'react';
import get from 'lodash.get';
import path from 'path';
import { Map } from 'immutable';
import { isDebug } from './utils';
import { remote } from 'electron';

import nedbPersist from 'nedb-persist';
import thunk from 'redux-thunk';
import { autoRehydrate, persistStore } from 'redux-persist-immutable';
import { compose, createStore, applyMiddleware } from 'redux';
import { connect, Provider } from 'react-redux';

import reducer from './reducers';

import Nav from './components/nav';
import Projects from './components/projects';
import Settings from './components/settings';

import { refreshToken } from './services/google-calendar';
import { setToken } from './actions/app';

const DB_PATH = path.join(remote.app.getPath('userData'), 'timav.db');

const initialStore = Map();

const store = createStore(reducer, initialStore, compose(applyMiddleware(thunk), autoRehydrate({ log: true })));

// access store from console for debug
if (isDebug) {
  window.getStoreState = () => store.getState().toJS();
}

const ROUTES = {
  settings: Settings,
  projects: Projects,
  // project: Project
  default: Settings
};

class App extends Component {
  componentDidMount() {
    const { token } = this.props;

    if (token) {
      refreshToken(token, (err, newToken) => {
        if (err) {
          // TODO: remove token and route to Settings
          console.error('refreshToken error', err);
        } else {
          this.props.setToken(newToken);
        }
      });
    } else {
      // TODO: route to Settings
      console.info('No token on init...');
    }
  }

  render() {
    const { route } = this.props;
    const Component = ROUTES[get(route, 'path', 'default')];

    return (
      <div>
        <Nav />
        <Component args={get(route, 'args')} />
      </div>
    );
  }
}

const mapStateToProps = state => {
  const route = state.get('route');

  return {
    token: state.get('token'),
    route: route ? route.toJS() : undefined
  };
};

const AppConnected = connect(mapStateToProps, { setToken })(App);

export default class AppProvider extends Component {
  constructor() {
    super();

    this.state = { isInited: false };
  }

  componentWillMount() {
    const options = { storage: nedbPersist({ filename: DB_PATH }) };

    persistStore(store, options, () => {
      this.setState({ isInited: true });
    });
  }

  render() {
    const { isInited } = this.state;

    if (!isInited) {
      return null;
    }

    return (
      <Provider store={store}>
        <AppConnected />
      </Provider>
    );
  }
}
