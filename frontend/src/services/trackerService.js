import api from "./api";


/* =========================================================
   NORMALIZE TRACKER
========================================================= */

function normalizeTracker(
  tracker
) {

  if (!tracker) {
    return tracker;
  }


  return {

    ...tracker,

    id:
      tracker._id ||
      tracker.id,

  };

}


/* =========================================================
   GET ALL
========================================================= */

export async function
getTrackers() {

  const response =
    await api.get(
      "/trackers"
    );


  const trackers =
    response.data?.data
      ?.trackers ||
    [];


  return trackers.map(
    normalizeTracker
  );

}


/* =========================================================
   GET ONE
========================================================= */

export async function
getTrackerById(
  id
) {

  const response =
    await api.get(
      `/trackers/${id}`
    );


  return normalizeTracker(
    response.data?.data
      ?.tracker
  );

}


/* =========================================================
   CREATE
========================================================= */

export async function
createTracker(
  data
) {

  const response =
    await api.post(
      "/trackers",
      data
    );


  return normalizeTracker(
    response.data?.data
      ?.tracker
  );

}


/* =========================================================
   UPDATE
========================================================= */

export async function
updateTracker(
  id,
  updates
) {

  const response =
    await api.patch(
      `/trackers/${id}`,
      updates
    );


  return normalizeTracker(
    response.data?.data
      ?.tracker
  );

}


/* =========================================================
   DELETE
========================================================= */

export async function
deleteTracker(
  id
) {

  const response =
    await api.delete(
      `/trackers/${id}`
    );


  return response.data;

}