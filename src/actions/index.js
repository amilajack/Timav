import uuid from 'uuid';

import * as calendar from '../services/google-calendar';
import { pick } from '../utils';

export const routeTo = (path, args) => ({
  type: 'ROUTE',
  payload: {
    path,
    args
  }
});

export const setToken = ({ accessToken, refreshToken }) => dispatch => {
  dispatch({
    type: 'SET_TOKEN',
    payload: {
      accessToken,
      refreshToken
    }
  });

  dispatch(getCalendars());
  dispatch(getEvents());
};

export const setSyncToken = syncToken => ({
  type: 'SET_SYNC_TOKEN',
  payload: {
    syncToken
  }
});

export const setTrackingCalendarId = calendarId => dispatch => {
  dispatch({
    type: 'SET_TRACKING_CALENDAR_ID',
    payload: {
      calendarId
    }
  });

  dispatch(resetEvents());
};

export const resetTokenAndRelatedSettings = () => ({
  type: 'RESET_TOKEN_AND_RELATED_SETTINGS'
});

export const setCashTag = cashTag => dispatch => {
  dispatch({
    type: 'SET_CASH_TAG',
    payload: {
      cashTag
    }
  });

  dispatch(resetEvents());
};

export const setCurrencySymbol = currencySymbol => ({
  type: 'SET_CURRENCY_SYMBOL',
  payload: {
    currencySymbol
  }
});

export const getCalendars = () => (dispatch, getState) => {
  const accessToken = getState().get('accessToken');

  if (!accessToken) {
    return console.warn('Tried to getCalendars without accessToken set');
  }

  calendar.getCalendars({ accessToken }, (err, response) => {
    if (err) {
      return console.error(err);
    }

    const calendars = response.items.map(pick(['id', 'summary']));

    dispatch({
      type: 'SET_CALENDARS',
      payload: {
        calendars
      }
    });
  });
};

export const resetEvents = () => dispatch => {
  dispatch({
    type: 'RESET_EVENTS'
  });

  dispatch(getEvents());
};

export const getEvents = () => (dispatch, getState) => {
  const state = getState();

  const accessToken = state.get('accessToken');
  const syncToken = state.get('syncToken');
  const trackingCalendarId = state.get('trackingCalendarId');
  const cashTag = state.get('cashTag');

  if (!accessToken || !trackingCalendarId) {
    return console.warn('Tried to getEvents without accessToken or trackingCalendarId set');
  }

  dispatch({
    type: 'EVENTS_DOWNLOAD_STARTED'
  });

  console.info('Getting events from API...');

  console.time('getAllEvents');
  calendar.getAllEvents({ accessToken }, syncToken, trackingCalendarId, (err, data) => {
    console.timeEnd('getAllEvents');

    if (err) {
      console.error(err);
      dispatch(resetTokenAndRelatedSettings());

      return;
    }

    const { syncToken } = data;

    console.time('parseEvents');
    const events = calendar.parseEvents(data.events, { cashTag });
    console.timeEnd('parseEvents');

    dispatch(setSyncToken(syncToken));

    console.time('setEvents');
    dispatch({
      type: 'SET_EVENTS',
      payload: {
        new: events.new,
        removed: events.removed
      }
    });
    console.timeEnd('setEvents');
  });
};

export const addChain = match => ({
  type: 'ADD_CHAIN',
  payload: {
    id: uuid.v4(),
    match
  }
});

export const updateChain = (id, match) => ({
  type: 'UPDATE_CHAIN',
  payload: {
    id,
    match
  }
});

export const removeChain = id => ({
  type: 'REMOVE_CHAIN',
  payload: {
    id
  }
});

export const moveChain = (id, direction) => ({
  type: 'MOVE_CHAIN',
  payload: {
    id,
    direction
  }
});
