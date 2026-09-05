import api from "./api";


/* ========================================
   NORMALIZE COLLABORATION
======================================== */

function normalizeCollaboration(
  collaboration
) {
  if (!collaboration) {
    return collaboration;
  }

  return {
    ...collaboration,

    /*
      Frontend compatibility

      MongoDB:
      _id

      Frontend:
      id
    */
    id:
      collaboration._id ||
      collaboration.id,
  };
}


/* ========================================
   GET ALL
======================================== */

export async function
getCollaborations() {

  const response =
    await api.get(
      "/collaborations"
    );


  const collaborations =
    response.data?.data
      ?.collaborations ||
    [];


  return collaborations.map(
    normalizeCollaboration
  );
}


/* ========================================
   GET ONE
======================================== */

export async function
getCollaborationById(
  id
) {

  const response =
    await api.get(
      `/collaborations/${id}`
    );


  return normalizeCollaboration(
    response.data?.data
      ?.collaboration
  );
}


/* ========================================
   CREATE
======================================== */

export async function
createCollaboration(
  data
) {

  const response =
    await api.post(
      "/collaborations",
      data
    );


  return normalizeCollaboration(
    response.data?.data
      ?.collaboration
  );
}


/* ========================================
   UPDATE
======================================== */

export async function
updateCollaboration(
  id,
  updates
) {

  const response =
    await api.patch(
      `/collaborations/${id}`,
      updates
    );


  return normalizeCollaboration(
    response.data?.data
      ?.collaboration
  );
}


/* ========================================
   DELETE
======================================== */

export async function
deleteCollaboration(
  id
) {

  const response =
    await api.delete(
      `/collaborations/${id}`
    );


  return response.data;
}