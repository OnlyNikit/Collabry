import CollaborationCard from "./CollaborationCard";
import "./CollaborationList.css";

function CollaborationList({
collaborations,
onEdit,
onDelete,
onStatusChange,
}) {
if (!collaborations || collaborations.length === 0) {
return ( <div className="clb-collab-empty"> <h2>No collaborations found</h2> <p>
Create a collaboration when a new deal is confirmed. </p> </div>
);
}

return ( <div className="clb-collaboration-list">
{collaborations.map((collaboration) => ( <CollaborationCard
       key={collaboration.id}
       collaboration={collaboration}
       onEdit={onEdit}
       onDelete={onDelete}
       onStatusChange={onStatusChange}
     />
))} </div>
);
}

export default CollaborationList;
