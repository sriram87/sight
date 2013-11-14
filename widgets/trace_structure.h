#pragma once

#include <list>
#include <vector>
#include <set>
#include <map>
#include <string>
#include <iostream>
#include <sstream>
#include <fstream>
#include <assert.h>
#include "../sight_common.h"
#include "../sight_structure_internal.h"
#include <sys/time.h>

namespace sight {
namespace structure {

void traceAttr(std::string label, std::string key, const attrValue& val);
void traceAttr(std::string label, std::string key, const attrValue& val, anchor target);

class trace: public block, public attrObserver, public common::trace
{
  friend void traceAttr(std::string label, std::string key, const attrValue& val);
  friend void traceAttr(std::string label, std::string key, const attrValue& val, anchor target);
  
  private:
  // Unique ID of this trace
  int traceID;
  
  // Maximum ID assigned to any trace object
  static int maxTraceID;
    
  // Maps the names of all the currently active traces to their trace objects
  static std::map<std::string, trace*> active;
  
  // Names of attributes to be used as context when visualizing the values of trace observations
  std::list<std::string> contextAttrs;
    
  mergeT merge;
  
  public:
  trace(std::string label, const std::list<std::string>& contextAttrs, showLocT showLoc=showBegin, vizT viz=table, mergeT merge=disjMerge, properties* props=NULL);
  trace(std::string label, std::string contextAttr,                    showLocT showLoc=showBegin, vizT viz=table, mergeT merge=disjMerge, properties* props=NULL);
  
  private:
  // Sets the properties of this object
  static properties* setProperties(int traceID, showLocT showLoc, vizT viz, mergeT merge, const std::list<std::string>& contextAttrs, properties* props);
  static properties* setProperties(int traceID, showLocT showLoc, vizT viz, mergeT merge, std::string contextAttr,                    properties* props);
  
  void init(std::string label, showLocT showLoc, vizT viz, mergeT merge);
  
  public:
  ~trace();
  
  private:
  
  // Records all the observations of trace variables since the last time variables in contextAttrs changed values
  std::map<std::string, std::pair<attrValue, anchor> > obs;
    
  // The keys of all the tracer attributes ever observed
  std::set<std::string> tracerKeys;
  
  public:
  // Observe for changes to the values mapped to the given key
  void observePre(std::string key);
  
  // Called by traceAttr() to inform the trace that a new observation has been made
  void traceAttrObserved(std::string key, const attrValue& val, anchor target);
  
  private:
  // Emits the JavaScript command that encodes the observations made since the last time a context attribute changed
  void emitObservations();
}; // class trace

// Basic API for measuring the elapsed counts of events.
// The measure class starts the measurement when instances of this class are constructed and stops when they are deconstructed.
// When measurement is performed, an attribute named valLabel is added to a trace named traceLabel.
// Users who wish to get the measurement value back may perform the measurement manually by calling doMeasure().
// The startMeasure()/endMeasure() API provides this direct access to measurement.
class measure {
  std::string traceLabel;
  std::string valLabel;
  // Counts the total time elapsed so far, accounting for any pauses and resumes
  double elapsed;
  // The time when we started or resumed this measure, whichever is most recent
  struct timeval lastStart;

  // Records whether time collection is currently paused
  bool paused;
  
  // Records whether we've already performed the measure
  bool measureDone;
  
  public:
  measure(std::string traceLabel, std::string valLabel);
  ~measure();
 
  // Pauses the measurement so that time elapsed between this call and resume() is not counted.
  // Returns true if the measure is not currently paused and false if it is (i.e. the pause command has no effect)
  bool pause();

  // Restarts counting time. Time collection is restarted regardless of how many times pause() was called
  // before the call to resume().
  bool resume();
 
  double doMeasure();
}; // class measure

measure* startMeasure(std::string traceLabel, std::string valLabel);
double endMeasure(measure* m);

class TraceMerger : public BlockMerger {
  public:
  TraceMerger(std::vector<std::pair<properties::tagType, properties::iterator> > tags,
              std::map<std::string, streamRecord*>& outStreamRecords,
              std::vector<std::map<std::string, streamRecord*> >& inStreamRecords,
              properties* props=NULL);
              
  // Sets the properties of the merged object
  static properties* setProperties(std::vector<std::pair<properties::tagType, properties::iterator> > tags,
                                   std::map<std::string, streamRecord*>& outStreamRecords,
                                   std::vector<std::map<std::string, streamRecord*> >& inStreamRecords,
                                   properties* props);

  // Sets a list of strings that denotes a unique ID according to which instances of this merger's 
  // tags should be differentiated for purposes of merging. Tags with different IDs will not be merged.
  // Each level of the inheritance hierarchy may add zero or more elements to the given list and 
  // call their parents so they can add any info. Keys from base classes must precede keys from derived classes.
  static void mergeKey(properties::tagType type, properties::iterator tag, 
                       std::map<std::string, streamRecord*>& inStreamRecords, std::list<std::string>& key);
}; // class TraceMerger

class TraceObsMerger : public Merger {
  public:
  TraceObsMerger(std::vector<std::pair<properties::tagType, properties::iterator> > tags,
              std::map<std::string, streamRecord*>& outStreamRecords,
              std::vector<std::map<std::string, streamRecord*> >& inStreamRecords,
              properties* props=NULL);

  // Sets a list of strings that denotes a unique ID according to which instances of this merger's 
  // tags should be differentiated for purposes of merging. Tags with different IDs will not be merged.
  // Each level of the inheritance hierarchy may add zero or more elements to the given list and 
  // call their parents so they can add any info. Keys from base classes must precede keys from derived classes.
  static void mergeKey(properties::tagType type, properties::iterator tag, 
                       std::map<std::string, streamRecord*>& inStreamRecords, std::list<std::string>& key);
}; // class TraceObsMerger

class TraceStreamRecord: public streamRecord {
  friend class TraceMerger;
  friend class TraceObsMerger;
  
  // Records the maximum TraceID ever generated on a given outgoing stream
  int maxTraceID;
  
  // Maps traceIDs to their merge types
  std::map<int, trace::mergeT> merge;
  
  // Maps the TraceIDs within an incoming stream to the TraceIDs on its corresponding outgoing stream
  std::map<streamID, streamID> in2outTraceIDs;
  
  public:
  TraceStreamRecord(int vID)              : streamRecord(vID, "trace") { /*maxTraceID=0;*/ }
  TraceStreamRecord(const variantID& vID) : streamRecord(vID, "trace") { /*maxTraceID=0;*/ }
  TraceStreamRecord(const TraceStreamRecord& that, int vSuffixID);
  
  // Returns a dynamically-allocated copy of this streamRecord, specialized to the given variant ID,
  // which is appended to the new stream's variant list.
  streamRecord* copy(int vSuffixID);
  
  // Given multiple streamRecords from several variants of the same stream, update this streamRecord object
  // to contain the state that succeeds them all, making it possible to resume processing
  void resumeFrom(std::vector<std::map<std::string, streamRecord*> >& streams);
  
  // Marge the IDs of the next graph (stored in tags) along all the incoming streams into a single ID in the outgoing stream,
  // updating each incoming stream's mappings from its IDs to the outgoing stream's IDs. Returns the traceID of the merged trace
  // in the outgoing stream.
  static int mergeIDs(std::map<std::string, std::string>& pMap, 
                       const std::vector<std::pair<properties::tagType, properties::iterator> >& tags,
                       std::map<std::string, streamRecord*>& outStreamRecords,
                       std::vector<std::map<std::string, streamRecord*> >& inStreamRecords);
      
  std::string str(std::string indent="") const;
}; // class TraceStreamRecord


}; // namespace structure 
}; // namespace sight
