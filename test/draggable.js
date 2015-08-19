'use strict';

var expect = chai.expect;

describe('Draggable directive', function () {
  var $compile, $rootScope, $scope, element;
  var testDragStartEvent, testDragEndEvent;

  beforeEach(module('draganddrop'));

  beforeEach(inject(function ($injector) {
    $compile = $injector.get('$compile');
    $rootScope = $injector.get('$rootScope');
    $scope = $rootScope.$new();
  }));

  beforeEach(function () {
    var dragDataStore = {};

    // simulated dragstart event
    testDragStartEvent = document.createEvent('CustomEvent');
    testDragStartEvent.initCustomEvent('dragstart', true, false, false);
    testDragStartEvent.dataTransfer = {
      setData: function(format, data) { dragDataStore[format] = data; },
      getData: function(format) { return dragDataStore[format]; }
    };
    sinon.spy(testDragStartEvent.dataTransfer, 'setData');
    sinon.spy(testDragStartEvent.dataTransfer, 'getData');

    // simulated dragend event
    testDragEndEvent = document.createEvent('CustomEvent');
    testDragEndEvent.initCustomEvent('dragend', true, false, false);
    testDragEndEvent.dataTransfer = {
      setData: function(format, data) { dragDataStore[format] = data; },
      getData: function(format) { return dragDataStore[format]; }
    };
    sinon.spy(testDragEndEvent.dataTransfer, 'setData');
    sinon.spy(testDragEndEvent.dataTransfer, 'getData');
  });

  function dispatchEvent(element, event) {
    element[0].dispatchEvent(event);
    $scope.$digest();
  }

  function createElement(tpl) {
    element = $compile(tpl)($scope);
    $scope.$digest();
  }

  describe('HTML5 draggable property', function() {
    it('should be enabled by default', function () {
      createElement('<div draggable></div>');
      expect(element).to.have.attr('draggable', 'true');
    });

    it('should be disabled when requested', function () {
      createElement('<div draggable="false"></div>');
      expect(element).to.have.attr('draggable', 'false');
    });
  });

  describe('on dragstart when "effect-allowed", "draggable-data" and "draggable-type" attributes are set', function () {

    it('should set effect and data', function () {
      var tpl = '<div draggable="true" effect-allowed="link" ' +
      'draggable-data="{foo: \'bar\'}" draggable-type="image"></div>';
      createElement(tpl);

      dispatchEvent(element, testDragStartEvent);

      expect(testDragStartEvent.dataTransfer.effectAllowed).to.equal('link');
      expect(testDragStartEvent.dataTransfer.setData).to.have.been.calledWith('json/image', '{"foo":"bar"}');
    });

    describe('error handling', function() {
      var originalHandler;

      // mandatory to test uncaught
      beforeEach(function() {
        originalHandler = window.onerror;
      });
      afterEach(function() {
         window.onerror = originalHandler;
      });

      it('on wrongly formatted draggable data, should throw a meaningful error', function (done) {
        var tpl = '<div draggable="true" effect-allowed="link" ' +
          'draggable-data="{foo: wrong !}" draggable-type="image"></div>';
        createElement(tpl);

        var uncaughtErrorMessage = null;
        window.onerror = function (message) {
          if (uncaughtErrorMessage) { // only handle one time to avoid error loops
            console.log('uncaught error !', message);
            return originalHandler.apply(null, arguments);
          }
          uncaughtErrorMessage = message || 'no message ?';
          return true;
        };

        dispatchEvent(element, testDragStartEvent);

        expect(uncaughtErrorMessage)
          .to.have.string('draggable-data can\'t be parsed by Angular : check your draggable directive invocation !');
        done();
      });

    });

    it('should listen for data changes', function () {
      var tpl = '<div draggable="true" effect-allowed="link" ' +
      'draggable-data="dragData" draggable-type="image"></div>';

      $scope.dragData = {foo: 'bar'};
      createElement(tpl);

      $scope.dragData = { bar: 'baz'};
      $scope.$digest();
      dispatchEvent(element, testDragStartEvent);

      expect(testDragStartEvent.dataTransfer.effectAllowed).to.equal('link');
      expect(testDragStartEvent.dataTransfer.setData).to.have.been.calledWith('json/image', '{"bar":"baz"}');
    });

    it('should prevent bubbling', function() {
      var tpl = '<div draggable draggable-data="{foo: \'bar\'}" draggable-type="image">'+
      '<div class="sub" draggable draggable-data="{toto: \'toto\'}" draggable-type="toto"></div>'+
      '</div>';
      createElement(tpl);

      // Bubbling can only be tested on firefox, due to a chrome bug where customEvent doesn't bubble
      dispatchEvent(element.find('.sub'), testDragStartEvent);

      expect(testDragStartEvent.dataTransfer.setData).to.have.been.calledOnce;
    });
  });

  describe('dragging class', function() {
    beforeEach(function() {
      var tpl = '<div draggable ' +
        'draggable-type="image" draggable-data="{foo: \'bar\'}" dragging-class="foo"></div>';
      createElement(tpl);
    });

    it('should be added on dragstart', function() {
      expect(element).to.not.have.class('foo');

      dispatchEvent(element, testDragStartEvent);

      expect(element).to.have.class('foo');
    });

    it('should be removed on dragend', function() {
      dispatchEvent(element, testDragStartEvent);
      dispatchEvent(element, testDragEndEvent);

      expect(element).to.not.have.class('foo');
    });
  });

  describe('handlers', function() {

    describe('dragstart', function() {
      beforeEach(function() {
        $scope.onDrag = sinon.spy();
        var tpl = '<div draggable ' +
          'draggable-type="image" draggable-data="{foo: \'bar\'}" ' +
          'drag-start="onDrag($event, $data)"></div>';
        createElement(tpl);

        dispatchEvent(element, testDragStartEvent);
      });

      it('should be called on dragstart when present', function() {
        expect($scope.onDrag).to.have.been.calledOnce;
      });

      it('should provide correct $event and $data', function() {
        expect($scope.onDrag.firstCall.args[0], '$event').to.equal(testDragStartEvent);
        expect($scope.onDrag.firstCall.args[1], '$data').to.deep.equal({
          foo: 'bar'
        });
      });
    });

    describe('dragend', function() {
      beforeEach(function() {
        $scope.onDrag = sinon.spy();
        var tpl = '<div draggable ' +
          'draggable-type="image" draggable-data="{foo: \'bar\'}" ' +
          'drag-end="onDrag($event, $data)"></div>';
        createElement(tpl);

        dispatchEvent(element, testDragStartEvent);
        dispatchEvent(element, testDragEndEvent);
      });

      it('should be called on dragend when present', function() {
        expect($scope.onDrag).to.have.been.calledOnce;
      });

      it('should provide correct $event and $data', function() {
        expect($scope.onDrag.firstCall.args[0], '$event').to.equal(testDragEndEvent);
        expect($scope.onDrag.firstCall.args[1], '$data').to.deep.equal({
          foo: 'bar'
        });
      });
    });
  });

});
