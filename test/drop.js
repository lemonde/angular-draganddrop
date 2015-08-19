'use strict';

var expect = chai.expect;

describe('Drop directive', function () {
  var $compile, $rootScope, $scope, element;
  var dragOverEvent, dropEvent, dragEnterEvent, dragLeaveEvent;

  beforeEach(module('draganddrop'));

  beforeEach(inject(function ($injector) {
    $compile = $injector.get('$compile');
    $rootScope = $injector.get('$rootScope');
    $scope = $rootScope.$new();
  }));

  beforeEach(function () {
    var testTypes = [ 'json/image', 'text/uri-list' ];
    var dragDataStore = {
      // pre-filled with test data
      'json/image': {foo: 'bar'},
      'json': {foo: 'bar'},
      'text/uri-list': 'http://dragdrop.com',
      'text': 'http://dragdrop.com'
    };

    // "dragover" event.
    dragOverEvent = document.createEvent('CustomEvent');
    dragOverEvent.initCustomEvent('dragover', false, false, false);
    sinon.spy(dragOverEvent, 'preventDefault');
    dragOverEvent.dataTransfer = {
      dropEffect: 'none',
      types: testTypes,
      setData: function(format, data) { dragDataStore[format] = data; },
      getData: function(format) { return dragDataStore[format]; }
    };

    // "drop" event.
    dropEvent = document.createEvent('CustomEvent');
    dropEvent.initCustomEvent('drop', false, false, false);
    sinon.spy(dropEvent, 'preventDefault');
    dropEvent.dataTransfer = {
      types: testTypes,
      setData: function(format, data) { dragDataStore[format] = data; },
      getData: function(format) { return dragDataStore[format]; }
    };

    // "dragenter" event.
    dragEnterEvent = document.createEvent('CustomEvent');
    dragEnterEvent.initCustomEvent('dragenter', false, false, false);
    dragEnterEvent.dataTransfer = {
      types: testTypes,
      setData: function(format, data) { dragDataStore[format] = data; },
      getData: function(format) { return dragDataStore[format]; }
    };

    // "dragleave" event.
    dragLeaveEvent = document.createEvent('CustomEvent');
    dragLeaveEvent.initCustomEvent('dragleave', false, false, false);
    dragLeaveEvent.dataTransfer = {
      types: testTypes,
      setData: function(format, data) { dragDataStore[format] = data; },
      getData: function(format) { return dragDataStore[format]; }
    };
  });

  function dispatchEvent(element, event) {
    element[0].dispatchEvent(event);
    $scope.$digest();
  }

  function createElement(tpl) {
    element = $compile(tpl)($scope);
    $scope.$digest();
  }

  describe('"drop-effect"', function () {
    it('should set dataTransfer.dropEffect', function () {
      var tpl = '<div drop drop-accept="true" drop-effect="link"></div>';
      createElement(tpl);

      dispatchEvent(element, dragOverEvent);

      expect(dragOverEvent.dataTransfer.dropEffect).to.equal('link');
    });
  });

  describe('"drop-accept"', function () {
    describe('string', function () {
      it('should accept type', function () {
        var tpl = '<div drop drop-accept="\'json/image\'"></div>';
        createElement(tpl);

        dispatchEvent(element, dragOverEvent);

        expect(dragOverEvent.preventDefault).to.have.been.called;
      });

      it('should not accept type', function () {
        var tpl = '<div drop drop-accept="\'xx\'"></div>';
        createElement(tpl);

        dispatchEvent(element, dragOverEvent);

        expect(dragOverEvent.preventDefault).to.not.have.been.called;
      });
    });

    describe('array', function () {
      it('should accept type', function () {
        var tpl = '<div drop drop-accept="[\'json/image\', \'xxx\']"></div>';
        createElement(tpl);

        dispatchEvent(element, dragOverEvent);

        expect(dragOverEvent.preventDefault).to.have.been.called;
      });

      it('should not accept type', function () {
        var tpl = '<div drop drop-accept="[\'xx\']"></div>';
        createElement(tpl);

        dispatchEvent(element, dragOverEvent);

        expect(dragOverEvent.preventDefault).to.not.have.been.called;
      });
    });

    describe('function', function () {
      it('should accept type', function () {
        $scope.checkType = function (types) {
          expect(types).to.eql(['json/image', 'text/uri-list']);
          return true;
        };

        var tpl = '<div drop drop-accept="checkType"></div>';
        createElement(tpl);

        dispatchEvent(element, dragOverEvent);

        expect(dragOverEvent.preventDefault).to.have.been.called;
      });

      it('should not accept type', function () {
        $scope.checkType = function (types) {
          expect(types).to.eql(['json/image', 'text/uri-list']);
          return false;
        };

        var tpl = '<div drop drop-accept="checkType"></div>';
        createElement(tpl);

        dispatchEvent(element, dragOverEvent);

        expect(dragOverEvent.preventDefault).to.not.have.been.called;
      });

      it('should be compatible with DOMStringList that are not array', function () {
        dragOverEvent.dataTransfer.types = {
          0: 'json/image',
          1: 'text/uri-list',
          length: 2
        };

        $scope.checkType = function (types) {
          expect(types).to.eql(['json/image', 'text/uri-list']);
          return false;
        };

        var tpl = '<div drop drop-accept="checkType"></div>';
        createElement(tpl);

        dispatchEvent(element, dragOverEvent);

        expect(dragOverEvent.preventDefault).to.not.have.been.called;
      });
    });

    describe('boolean', function () {
      it('should accept type', function () {
        var tpl = '<div drop drop-accept="true"></div>';
        createElement(tpl);

        dispatchEvent(element, dragOverEvent);

        expect(dragOverEvent.preventDefault).to.have.been.called;
      });

      it('should not accept type', function () {
        var tpl = '<div drop drop-accept="false"></div>';
        createElement(tpl);

        dispatchEvent(element, dragOverEvent);

        expect(dragOverEvent.preventDefault).to.not.have.been.called;
      });
    });
  });

  describe('"drag-over-class"', function () {
    it('should add class if accepted', function () {
      var tpl = '<div drop drag-over-class="dragover" drop-accept="true"></div>';
      createElement(tpl);

      dispatchEvent(element, dragOverEvent);

      expect(element).to.have.class('dragover');
    });

    it('should remove class on drag leave', function () {
      var tpl = '<div drop drag-over-class="dragover" drop-accept="true"></div>';
      createElement(tpl);

      dispatchEvent(element, dragOverEvent);
      dispatchEvent(element, dragLeaveEvent);

      expect(element).to.not.have.class('dragover');
    });

    it('should remove class on drop', function () {
      var tpl = '<div drop drag-over-class="dragover" drop-accept="true"></div>';
      createElement(tpl);

      dispatchEvent(element, dragOverEvent);
      dispatchEvent(element, dropEvent);

      expect(element).to.not.have.class('dragover');
    });
  });

  describe('handlers', function() {
    var expectedData = {
      'json/image': {foo: 'bar'},
      'json': {foo: 'bar'},
      'text/uri-list': 'http://dragdrop.com',
      'text': 'http://dragdrop.com'
    };

    describe('"drag-enter"', function() {
      beforeEach(function() {
        $scope.onDrag = sinon.spy();
        var tpl = '<div drop drop-accept="true" drag-enter="onDrag($event, $data)"></div>';
        createElement(tpl);

        dispatchEvent(element, dragEnterEvent);
      });

      it('should be called on dragenter when present', function() {
        expect($scope.onDrag).to.have.been.calledOnce;
      });

      it('should provide correct $event and $data', function() {
        expect($scope.onDrag.firstCall.args[0], '$event').to.equal(dragEnterEvent);
        expect($scope.onDrag.firstCall.args[1], '$data').to.deep.equal(expectedData);
      });
    });

    describe('"drag-leave"', function() {
      beforeEach(function() {
        $scope.onDrag = sinon.spy();
        var tpl = '<div drop drop-accept="true" drag-leave="onDrag($event, $data)"></div>';
        createElement(tpl);

        dispatchEvent(element, dragLeaveEvent);
      });

      it('should be called on dragleave when present', function() {
        expect($scope.onDrag).to.have.been.calledOnce;
      });

      it('should provide correct $event and $data', function() {
        expect($scope.onDrag.firstCall.args[0], '$event').to.equal(dragLeaveEvent);
        expect($scope.onDrag.firstCall.args[1], '$data').to.deep.equal(expectedData);
      });
    });

    describe('"drag-over"', function() {
      beforeEach(function() {
        $scope.onDrag = sinon.spy();
        var tpl = '<div drop drop-accept="true" drag-over="onDrag($event, $data)"></div>';
        createElement(tpl);

        dispatchEvent(element, dragOverEvent);
      });

      it('should be called on dragover when present', function() {
        expect($scope.onDrag).to.have.been.calledOnce;
      });

      it('should provide correct $event and $data', function() {
        expect($scope.onDrag.firstCall.args[0], '$event').to.equal(dragOverEvent);
        expect($scope.onDrag.firstCall.args[1], '$data').to.deep.equal(expectedData);
      });
    });

    describe('"drop"', function() {
      beforeEach(function() {
        $scope.onDrag = sinon.spy();
        var tpl = '<div drop="onDrag($event, $data)" drop-accept="true"></div>';
        createElement(tpl);

        dispatchEvent(element, dropEvent);
      });

      it('should be called on drop when present', function() {
        expect($scope.onDrag).to.have.been.calledOnce;
      });

      it('should provide correct $event and $data', function() {
        expect($scope.onDrag.firstCall.args[0], '$event').to.equal(dropEvent);
        expect($scope.onDrag.firstCall.args[1], '$data').to.deep.equal(expectedData);
      });
    });
  });

  describe('throttling', function() {
    // https://github.com/lemonde/angular-draganddrop/issues/2
    it.skip('should limit the calls to the drag-over callback');
  });

  describe('automatic handling of HTML5 API quirks', function() {
    // https://github.com/lemonde/angular-draganddrop/issues/2
    it.skip('should call preventDefault() on selected events');
  });

});
