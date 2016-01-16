declare var require, exports, d3, d3plus, process, jsyaml;

var React = require("react");
var ReactDOM = require("react-dom");
let {Card} = require("./card");
let fs = require("fs");
let $ = require("jquery");
let {Demo} = require("./Demo");
let Textarea = require('react-textarea-autosize');

function remove(arr, obj) {
    arr.splice(arr.indexOf(obj),1);
}

function uniqueCardNames(cards) {
    let nameMap = {};
    for (let name of cards) {
        nameMap[name] = true;
    }
    return Object.keys(nameMap);
}

let nextToggle = {build: "deck", deck: "play", play: "edit", edit: "build"};
//let nextToggle = {build: "deck", deck: "edit", edit: "build"};

let toggleButton = ({screen, toggle}) => (<div> 
    <button onClick={toggle} type="button" class="toggle btn btn-default btn-xs pull-right"> 
        {`Switch from "${screen}" mode to "${nextToggle[screen]}" mode`}
    </button> 
</div>);

function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

let UnitDeck = React.createClass({
  render() {
      let {cards} = this.props;
      let name = cards[cards.length - 1];
      let {cardData, doWithCard} = this.props;
      return <div> 
          Unit deck:
          <div>
                {!name ? [] : [<Card key={name}
                    card={cardData[name]} 
                    onClick={doWithCard}/>
                  ]}
            </div>
      </div>;
  }
});

let stateHistory = [];
let App = React.createClass({
  getInitialState() {
    return {opponentsDeck: [], unitDeck: [], unitUndrawn: [], action: "To Hand", discard: [], hand: [], undrawnCards: null, screen: "build", lastSaved: null, cards: [], prevChangedCards: [], prevCardData: [], cardData: this.parseCards(this.props.initialYaml), searchTerm: ".*"};
  },
  renderBoardControl() {
      let {action} = this.state;
      let makeIt = (name) => {
          return () => {this.state.action = name; this.update();};
      };
      let button = (name) => <button onClick={makeIt(name)}> {name} </button>;

      return <div>
          You are currenting doing a {action} action on-click.
          {button("To Discard")}
          {button("To Hand")}
          {button("Specific Card to Hand")}
          {button("First with Trait to Hand")}
      </div>;
  },
  parseCards(yaml) {
      try {
        let cardData = jsyaml.safeLoad(yaml);
        for (let cardName of Object.keys(cardData)) {
            cardData[cardName].name = cardName;
        }
        return cardData;
      } catch(err) {
         // Return last:
         return this.state ? this.state.cardData : [];
      }
  },
  actualCards() {
      return this.state.cards.filter(name => this.state.cardData[name] != null);
  },
  uniqueCards() {
      return uniqueCardNames(this.actualCards());
  },
  changedCards() {
    let changedCards = [];
    let {prevCardData, cardData} = this.state;
    for (let name of Object.keys(cardData)) {
        if (prevCardData[name] == null) {
            changedCards.push(name);
        } else if (JSON.stringify(prevCardData[name]) !== JSON.stringify(cardData[name])) {
            changedCards.push(name);
        }
    }
    return changedCards;
  },
  componentDidMount() {
      if (fs.writeFileSync) {
          var isCtrl = false;
          (document as any).onkeyup =  (e) => {if (e.keyCode === 17) isCtrl = false;};
          (document as any).onkeydown = (e) => {
              if (e.keyCode == 17) isCtrl = true;
              if (e.keyCode == 83 && isCtrl && this.yaml != null) {
                 fs.writeFileSync("./cards.yaml", this.yaml);
                 this.state.lastSaved = new Date();
                 this.update();
                 return false;
              }
          };
      }
  },
  undo() {
      if (stateHistory.length >= 1) {
          console.log("STATE UPDATE");
          this.setState(JSON.parse(stateHistory.pop()));
      }
  },
  update() {
      stateHistory.push(JSON.stringify(this.state));
      this.setState(this.state);
  },
  updateYaml(yaml) {
      let changedCards = this.changedCards();
      if (changedCards.length >= 1) {
          if (Object.keys(this.state.prevChangedCards).join(",") !== Object.keys(changedCards).join(",")) {
              this.state.prevChangedCards = changedCards;
          }
      }
      this.state.prevCardData = this.state.cardData;
      this.state.cardData = this.parseCards(yaml);
      this.yaml = yaml;
      this.setState(this.state);
  },
  count(n) {
      let count = 0;
      for (let name of this.actualCards()) {
         if (n === name) count++;
      }
      return count;
  },
  position(n) {
      let index = this.uniqueCards().indexOf(n);
      if (index === -1) return "";
      return `#${index+1} `;
  },
  toggle() {
      if ( (this.state.screen = nextToggle[this.state.screen]) == "play") {
        this.state.undrawnCards = shuffle(this.state.cards.filter(x => this.state.cardData[x] != null));
        this.state.unitUndrawn = shuffle(this.state.unitDeck.filter(x => this.state.cardData[x] != null));
          this.update();
      } else
          this.setState(this.state);
  },
  render() {
    let renderLogic = {
        build: () => {
            let regex = new RegExp(this.state.searchTerm.toLowerCase());
            let matchingNames = [];
            for (let name of Object.keys(this.state.cardData)) {
                let card = this.state.cardData[name];
                let matched = false;
                if (name.toLowerCase().match(regex)) {
                    matched = true;
                } else {
                    for (let attribute of Object.keys(card)) {
                        let compound = (`${attribute} ${card[attribute]}`).toLowerCase();
                        if (this.state.searchTerm.toLowerCase().indexOf(compound) > -1) {
                            matched = true;
                            break;
                        }
                    }
                }
                if (!matched) {
                    try {
                        for (let trait of card.Traits) {
                            if (trait.toLowerCase().match(regex)) {
                                matched = true;
                                break;
                            }
                        } 
                    } catch(err) {
                    }
                }
                if (matched) {
                    matchingNames.push(name);
                }
            }
            return this.renderCommon({matchingNames});
        },
        deck: () => {
            return this.renderCommon({matchingNames: this.uniqueCards()});
        },
        play: () => {
            return this.renderCommon({matchingNames: this.state.hand});
        },
        edit: () => {
            let toggle = () => this.toggle();
            let {screen, prevChangedCards, cardData, lastSaved} = this.state;
            let changedCards = this.changedCards();
            if (changedCards.length === 0) {
                changedCards = prevChangedCards || [];
            }
            changedCards = changedCards.filter(name => cardData[name] != null);

            return <div>
                    <div>{lastSaved ? `Last time saved to cards.yaml: ${lastSaved}`: ""}</div>
                    {this.renderCommon({matchingNames: changedCards})}
            </div>;
        }
    };
    let displayIframe = (this.state.screen === "edit") ? "inline-block" : "none";
    let displaySearchBar = !(this.state.screen === "edit" && this.state.screen === "play") ? "inline-block" : "none";
    let displayDrawCardButton = (this.state.screen === "play") ? "inline-block" : "none";
    let iFrameGetRef = (iframe) => {
        let jnode = $(ReactDOM.findDOMNode(iframe));
        jnode.load(_ => onIframeLoad(iframe));
    };
    let iframe = <iframe 
        ref={iFrameGetRef} key="iframe" 
        frameBorder="0" src="iframe.html" 
        style={{width: "1500px", height: "440px", display: displayIframe}}
        scrolling="no"
    />;
    let searchValues = {};
    let actionButton = (hasSearch, actionText, action) => {
        let components = [];
        components.push(<button onClick={() => action(searchValues[actionText])}>
                {actionText}
            </button>);
        if (hasSearch) {
            components.push(<input 
                type="text" 
                value={searchValues[actionText]}
                style={{display: displaySearchBar}}
                onChange={({target: {value}}) => {
                    searchValues[actionText] = value;
                }} />);
        }
        return <div> {components} </div>;
    }
//            {this.renderBoardControl()}
    return <div> 
        {iframe}
        <div style={{display: displayDrawCardButton}}> 
            {<UnitDeck ref="unit-deck" cards={this.state.unitUndrawn} cardData={this.state.cardData} doWithCard={() => {
                var name;
                if (name = this.state.unitUndrawn.pop()) {
                    this.state.hand.push(name);
                    this.update();
                }
            }}/>}
            {actionButton(false, "Undo", () => {
                this.undo();
            })}
            {actionButton(true, "Get card to hand", (searchTerm) => {
                for (let i = 0; i < this.state.undrawnCards.length; i++) {
                    let card = this.state.undrawnCards[i];
                    let {Traits} = this.state.cardData[card];
                    for (let trait of Traits || []) {
                        if (trait.toLowerCase() === searchTerm.toLowerCase()) {
                            this.state.undrawnCards.splice(i, 1);
                            this.state.hand.push(card);
                            this.update();
                            return;
                        }
                    }
                    if (card.toLowerCase().match(new RegExp(searchTerm.toLowerCase()))) {
                        this.state.undrawnCards.splice(i, 1);
                        this.state.hand.push(card);
                        this.update();
                        return;
                    }
                }
            })}
            <button onClick={() => {
                if (this.state.undrawnCards.length >= 1) {
                    this.state.hand.push(this.state.undrawnCards.pop());
                }
                this.setState(this.state);
            }} type="button" class="toggle btn btn-default btn-xs pull-right"> 
                Draw a card. 
            </button>
 
        </div>

        <div style={{display: displaySearchBar}}> 
            Searchbar, use input like eg 'gold 2 gold 1', 'miracle 1', 'humanoid', 'divine', 'plumbus', etc:
        </div>
        <div> 
        <input 
            type="text" 
            key="searchbar"
            style={{display: displaySearchBar}}
            onChange={({target: {value}}) => {
                this.state.searchTerm = value;
                this.setState(this.state);
            }} /> 
        </div>
        {renderLogic[this.state.screen]()}
    </div>;
  },
  renderCommon({matchingNames}) {
    let i = 1;
    function matches(name) {// TODO unused
        return matchingNames.indexOf(name) >= 0;
    }
    let cardNames = Object.keys(this.state.cardData);
    let key= (name) => {
        if (this.state.screen !== "play") return `card-${name}-${this.state.cardData[name].Description || "<nodesc>"}`;
        return `card-${name}-${this.state.cardData[name].Description || "<nodesc>"}-${i++}`;
    };
    let onClick= (name) => (e) => {
        if (this.state.screen === "build") {
            e.preventDefault();
            if (this.count(name) == 2) {
               remove(this.state.cards, name);
               remove(this.state.cards, name); 
            } else {
               this.state.cards.push(name);
            }
            this.state.cards.sort();
            this.setState(this.state);
        } else if (this.state.screen === "play") {
            this.state.hand.splice(this.state.hand.indexOf(name), 1);
            this.state.discard.push(name);
            this.update();
        }
    };
    return (
        <div>
            <div style={{display:  this.state.screen === "play" ? "none" : "inline-block"}}>
                Paste your unit deck here, sorry no card select support:
                <div> <Textarea
                    key="deckform"
                    value={this.state.unitDeck.join('\n')}
                    onChange={({target: {value}}) => {
                        this.state.unitDeck = value.split('\n');
                        this.setState(this.state);
                    }}/> </div>
                Paste your opponent's deck here:
                <div> <Textarea
                    key="deckform"
                    value={this.state.opponentsDeck.join('\n')}
                    onChange={({target: {value}}) => {
                        this.state.opponentsDeck = value.split('\n');
                        this.setState(this.state);
                    }}/> </div>
                You are currently composing your deck. It has the following cards. You can paste here, or select cards below.
                <div> <Textarea
                    key="deckform"
                    value={this.state.cards.join('\n')}
                    onChange={({target: {value}}) => {
                        this.state.cards = value.split('\n');
                        this.setState(this.state);
                    }}/> </div>
            </div>
            {toggleButton({screen: this.state.screen, toggle: () => this.toggle()})}
            <div> {this.state.screen == "deck" ? "Current deck: " : "Available cards: " } </div>
            <div style={{width: "1200px", height: "100%", display: "inline-block", overflow: "visible"}} > {
               matchingNames.map((name) => 
                    <Card key={key(name)}
                        card={this.state.cardData[name]} 
                        amount={`${this.position(name)}(${this.count(name)})`} 
                        onClick={onClick(name)}
                    />
               )
            }
            </div>
            {
            (this.state.screen === "play" ?
                <div>
                <div> Discard pile: </div>
                <div style={{width: "1200px", height: "100%", display: "inline-block", overflow: "visible"}} > {
                   this.state.discard.map((name) => 
                        <Card key={key(name)}
                            card={this.state.cardData[name]} 
                            amount={`${this.position(name)}(${this.count(name)})`} 
                            onClick={() => {
                                this.state.discard.splice(this.state.discard.indexOf(name), 1);
                                this.state.undrawnCards.push(name);
                                shuffle(this.state.undrawnCards);
                                this.update();
                            }}
                        />
                   )
                } </div>
                <div> {"Cards in play:"} </div>
                <div style={{width: "1200px", height: "100%", display: "inline-block", overflow: "visible"}} > {
                   uniqueCardNames(this.state.opponentsDeck.concat(this.state.cards)).filter(x => this.state.cardData[x] != null).map((name) => 
                        <Card key={key(name)}
                            card={this.state.cardData[name]} 
                            amount={`${this.position(name)}(${this.count(name)})`} 
                        />
                   )
                } </div>
                </div> : [])}
        </div>
   );
  }
});

function onMessage(callback) {
    let eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
    let eventer = window[eventMethod];
    let messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";
    eventer(messageEvent, (({message, data}) => callback(message || data)), false);
}

function onIframeLoad(iframe) {
    let iframeRaw = ReactDOM.findDOMNode(iframe);
    function post(defaultContent) {
        iframeRaw.contentWindow.postMessage(defaultContent, "*");
    }
    if (fs.readFileSync) {
        post(fs.readFileSync("./cards.yaml").toString());
    } else {
        $.ajax({
            url: "https://raw.githubusercontent.com/ludamad/card-rules/master/cards.yaml",
            // Set to a default on error:
            error: (err) => post(`
        Goblin:\n          Gold: 2\n          Health: 2\n          Attack: 1\n          Movement: 2\n          Range: 1\n          Description: A short and fast goblin.\n          Traits: [Humanoid]
        `)
        }).done(post);
    }
}

function setupIframeCommunication(appRef) {
    onMessage(yamlData => appRef.updateYaml(yamlData));
}

/*ReactDOM.render(<App 
        ref={appRef => setupIframeCommunication(appRef)} 
        initialYaml="" 
    />, document.getElementById("app-container")
);*/

ReactDOM.render(<Demo/>, document.getElementById("app-container"));

