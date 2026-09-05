import {

  createContext,

  useContext,

  useEffect,

  useState,

} from "react";


import {

  getTrackers,

  createTracker,

  updateTracker,

  deleteTracker,

} from "../services/trackerService";


const TrackerContext =
  createContext(null);


export function
TrackerProvider({
  children,
}) {


  const [
    trackers,
    setTrackers,
  ] = useState([]);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    error,
    setError,
  ] = useState(null);


  /* =====================================================
     LOAD TRACKERS
  ===================================================== */

  async function
  loadTrackers() {

    try {

      setLoading(true);

      setError(null);


      const data =
        await getTrackers();


      setTrackers(
        data
      );

    } catch (err) {

      console.error(
        "Failed to load trackers:",
        err
      );


      setError(
        err.message ||
        "Failed to load trackers"
      );

    } finally {

      setLoading(false);

    }

  }


  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  useEffect(
    () => {

      loadTrackers();

    },
    []
  );


  /* =====================================================
     CREATE
  ===================================================== */

  async function
  addTracker(
    data
  ) {

    const newTracker =
      await createTracker(
        data
      );


    setTrackers(
      (currentTrackers) => [

        newTracker,

        ...currentTrackers,

      ]
    );


    return newTracker;

  }


  /* =====================================================
     UPDATE
  ===================================================== */

  async function
  updateTrackerById(
    id,
    updates
  ) {

    const updatedTracker =
      await updateTracker(
        id,
        updates
      );


    setTrackers(
      (currentTrackers) =>

        currentTrackers.map(
          (tracker) =>

            tracker.id === id
              ? updatedTracker
              : tracker
        )
    );


    return updatedTracker;

  }


  /* =====================================================
     DELETE
  ===================================================== */

  async function
  deleteTrackerById(
    id
  ) {

    await deleteTracker(
      id
    );


    setTrackers(
      (currentTrackers) =>

        currentTrackers.filter(
          (tracker) =>
            tracker.id !== id
        )
    );

  }


  return (

    <TrackerContext.Provider
      value={{

        trackers,

        loading,

        error,

        loadTrackers,

        addTracker,

        updateTracker:
          updateTrackerById,

        deleteTracker:
          deleteTrackerById,

      }}
    >

      {children}

    </TrackerContext.Provider>

  );

}


export function
useTracker() {

  const context =
    useContext(
      TrackerContext
    );


  if (!context) {

    throw new Error(
      "useTracker must be used inside TrackerProvider"
    );

  }


  return context;

}