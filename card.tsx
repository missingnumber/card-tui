declare var require, exports;

var React = require("react");
var ReactDOM = require("react-dom");
let CardUnit  = require("./src/card-unit").ReactSvg;
let CardSpell = require("./src/card-spell").ReactSvg;
let orBar = (s) => (s == null ? "-" : s);

exports.Card = React.createClass({
      componentDidMount() {
        d3plus.textwrap().container(
            d3.select(ReactDOM.findDOMNode(this.refs.card).querySelector('.wrap'))
        ).draw();
      },
     
    render() {
        let {card} = this.props;
        let cardObject = (typeof card.Attack === "undefined" ?
            <CardSpell ref="card"
                NAME={card.name}
                GOLD={card.Gold || "-"}
                MANA={card.Miracle || "-"}
                TYPE={(card.Traits || []).join("/")}
                IMAGE_FILE={card.Image || "http://vignette4.wikia.nocookie.net/assassinscreed/images/a/af/Question_mark.png/revision/latest/scale-to-width-down/380?cb=20121118055707"}
                AMOUNT={this.props.amount || ""}
                DESCRIPTION={card.Description} />
            : <CardUnit ref="card"
                NAME={card.name}
                GOLD={orBar(card.Gold)}
                MANA={orBar(card.Miracle)}
                TYPE={(card.Traits || []).join("/")}
                DESCRIPTION={card.Description} 
                HEALTH={orBar(card.Health)}
                ATTACK={orBar(card.Attack)}
                AMOUNT={this.props.amount || ""}
                IMAGE_FILE={card.Image || "http://vignette4.wikia.nocookie.net/assassinscreed/images/a/af/Question_mark.png/revision/latest/scale-to-width-down/380?cb=20121118055707"}
                MOVEMENT={orBar(card.Movement)}
                RANGE={orBar(card.Range)}/>
        );
        return <div style={{width: "280", height: "100%", display: "inline-block", overflow: "visible"}} onClick={this.props.onClick}> {cardObject} </div>;
    }
});
