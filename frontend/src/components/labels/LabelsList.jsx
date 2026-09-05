import {
  Link,
} from "react-router-dom";

import {
  Tag,
} from "lucide-react";

import {
  useLabels,
} from "../../context/LabelsContext";

import "./LabelsList.css";


function Labels() {

  const {
    labels,
    loading,
    error,
  } = useLabels();


  if (loading) {
    return (
      <div className="clb-labels-page">

        <p>
          Loading labels...
        </p>

      </div>
    );
  }


  if (error) {
    return (
      <div className="clb-labels-page">

        <p>
          {error}
        </p>

      </div>
    );
  }


  return (
    <div className="clb-labels-page">


      <header className="clb-labels-page__header">

        <div>

          <div className="clb-labels-page__title">

            <Tag size={26} />

            <h1>
              Labels
            </h1>

          </div>


          <p>
            Organize and manage your emails
            by labels.
          </p>

        </div>

      </header>


      <div className="clb-labels-grid">


        {labels.length === 0 ? (

          <p>
            No labels created yet.
          </p>

        ) : (

          labels.map(
            (label) => (

              <Link
                key={label._id}
                to={`/labels/${label._id}`}
                className="clb-label-card"
              >

                <div className="clb-label-card__icon">

                  {label.icon || "🏷️"}

                </div>


                <div className="clb-label-card__content">

                  <h2>
                    {label.name}
                  </h2>


                  <p>

                    {label.description ||
                      "No description"}

                  </p>

                </div>


              </Link>

            )
          )

        )}


      </div>


    </div>
  );
}


export default Labels;