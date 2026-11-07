from pathlib import Path
src=(Path(__file__).resolve().parents[1]/'ESP32 local code/SeraSmart/SeraSmart.ino').read_text()
def fn(name,ret='void'):
 start=src.index(ret+' '+name+'(');brace=src.index('{',start);depth=1;i=brace+1
 while depth:
  depth+=(src[i]=='{')-(src[i]=='}');i+=1
 return src[start:i]
code=r'''
#include <ArduinoJson.h>
#include <iostream>
#include <cassert>
#include <cmath>
#include <algorithm>
using String=std::string;using std::min;using std::isfinite;
unsigned long test_ms=1000000;
unsigned long millis(){return test_ms;}void delay(unsigned long n){test_ms+=n;}
int pumpStarts=0;
struct Actuator{bool pump=false;void porneste(){if(pump)pumpStarts++;}void opreste(){}};Actuator blue,pompa{true};
bool persisted=false,storageOk=true;
struct FakePreferences{std::size_t putBool(const char*,bool v){if(!storageOk)return 0;persisted=v;return 1;}}wateringState;
bool wateringStateReady=true;
unsigned long lastConfigMs=0,lastWateringMs=0;
bool configReady=false,configuredAutoWater=false,configuredFanAuto=false,hasWatered=false;
String pendingAckPath,pendingAckBody;
float configuredSoilThreshold=30;
int configuredDuration=1;float configuredFanStart=28,configuredFanStop=24;
const unsigned long MAX_WATER_DURATION_MS=1000,WATER_COOLDOWN_MS=1800000;
const int SOIL_TOO_WET=70;const bool ROOT_ESP_ENABLE_REMOTE_WATERING=true;
String configResponse,commandResponse,lastAck,lastAckPath;
int ackCode=200,lastDeviceHttpStatus=0,ackCalls=0,claimCalls=0,statusCalls=0;
String serverStatus="Failed";
bool deviceApi(const char*,const String& path,const String& body,String& response){
 lastDeviceHttpStatus=200;
 if(path=="/config"){response=configResponse;return true;}
 if(path=="/commands/next"){claimCalls++;response=commandResponse;return true;}
 if(path.find("/ack")!=String::npos){ackCalls++;lastAck=body;lastAckPath=path;lastDeviceHttpStatus=ackCode;return ackCode>=200&&ackCode<300;}
 if(path.find("/status")!=String::npos){statusCalls++;response="{\"Status\":\""+serverStatus+"\"}";return true;}
 return false;
}
'''
code+='\n'.join([fn('beginWaterCycle','bool'),fn('fetchCareSettings'),fn('retryPendingAck'),fn('pollAndHandleCommand')])
code=code.replace('.substring(','.substr(').replace('.compareTo(','.compare(')
code+=r'''
int main(){
 configResponse=R"({"linked":true,"settings":{"SoilMoistureThreshold":30.75,"WateringDurationSeconds":5,"FanStartTemperature":28,"FanStopTemperature":24,"AutomaticWateringEnabled":false,"FanAutomaticEnabled":false}})";
 fetchCareSettings();assert(configReady&&!configuredAutoWater&&!configuredFanAuto&&configuredSoilThreshold==30.75f);
 std::cout<<"PASS real JSON booleans and fractional threshold retained\n";
 configResponse=R"({"linked":true,"settings":{"SoilMoistureThreshold":30,"WateringDurationSeconds":5,"FanStartTemperature":28,"FanStopTemperature":24,"AutomaticWateringEnabled":"0","FanAutomaticEnabled":"0"}})";
 fetchCareSettings();assert(!configReady&&!configuredAutoWater&&!configuredFanAuto);
 std::cout<<"PASS string-zero flags rejected and automatic controls disabled\n";
 commandResponse=R"({"command":{"CommandID":"9223372036854775807","CommandType":"Water","DurationSeconds":5}})";
 ackCode=500;pollAndHandleCommand(20);assert(pumpStarts==1&&persisted&&!pendingAckPath.empty());
 assert(lastAckPath=="/commands/9223372036854775807/ack");
 for(int i=0;i<5;i++)pollAndHandleCommand(20);
 assert(pumpStarts==1&&claimCalls==1);
 std::cout<<"PASS 19-digit command ID retained and five lost ACK retries do not replay pump\n";
 ackCode=409;serverStatus="Failed";pollAndHandleCommand(20);assert(pendingAckPath.empty()&&statusCalls==1&&pumpStarts==1);
 ackCode=200;commandResponse=R"({"command":{"CommandID":"51","CommandType":"Water","DurationSeconds":5}})";
 pollAndHandleCommand(20);assert(claimCalls==2&&pumpStarts==1);
 std::cout<<"PASS terminal ACK conflict reconciles and subsequent command polling resumes\n";
 // Same state setup() restores from NVS: cooldown restarts conservatively on reboot.
 hasWatered=persisted;lastWateringMs=millis();pollAndHandleCommand(20);assert(pumpStarts==1);
 test_ms+=WATER_COOLDOWN_MS;pollAndHandleCommand(20);assert(pumpStarts==2);
 std::cout<<"PASS persisted watering marker blocks reboot-equivalent immediate watering\n";
 hasWatered=false;storageOk=false;pollAndHandleCommand(20);assert(pumpStarts==2);
 std::cout<<"PASS failed persistent write prevents pump actuation\n";
 storageOk=true;hasWatered=false;pollAndHandleCommand(70);pollAndHandleCommand(101);assert(pumpStarts==2);
 std::cout<<"PASS wet and invalid soil do not actuate pump\n";
 for(const char* id:{"0","01","3x","9223372036854775808"}){
  commandResponse=String("{\"command\":{\"CommandID\":\"")+id+"\",\"CommandType\":\"Water\",\"DurationSeconds\":5}}";
  pollAndHandleCommand(20);assert(pumpStarts==2);
 }
 std::cout<<"PASS invalid and out-of-range command IDs cannot actuate\n";
}
'''
import os,subprocess,tempfile
headers=os.environ.get('ARDUINOJSON_INCLUDE')
if not headers:raise SystemExit('Set ARDUINOJSON_INCLUDE to the src folder of ArduinoJson 7.4.2.')
with tempfile.TemporaryDirectory(prefix='root-esp-network-') as temp:
 cpp=Path(temp)/'test.cpp';cpp.write_text(code)
 binary=Path(temp)/'test'
 subprocess.run(['g++','-std=c++17','-I',headers,str(cpp),'-o',str(binary)],check=True)
 subprocess.run([str(binary)],check=True)
