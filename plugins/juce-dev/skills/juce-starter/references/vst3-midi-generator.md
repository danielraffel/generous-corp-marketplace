# VST3 MIDI Generator Plugin Configuration

How to configure a JUCE plugin as a cross-DAW MIDI generator that works in Ableton Live, FL Studio, Cubase, Bitwig, and Reaper — while keeping the AU as a MIDI effect for Logic Pro.

## The Problem

JUCE's `IS_MIDI_EFFECT TRUE` creates a plugin that works as a MIDI effect in Logic (AU) but is rejected by most other DAWs (Ableton, FL Studio) as a VST3. The VST3 spec has no native "MIDI Effect" concept.

## The Solution

Use these CMakeLists.txt settings:

```cmake
juce_add_plugin(${PROJECT_NAME}
    IS_SYNTH TRUE                    # Required for Ableton to route MIDI output
    NEEDS_MIDI_INPUT TRUE
    NEEDS_MIDI_OUTPUT TRUE
    IS_MIDI_EFFECT FALSE             # VST3 doesn't support MIDI effects
    AU_MAIN_TYPE kAudioUnitType_MIDIProcessor  # AU stays as MIDI effect for Logic
    VST3_CATEGORIES "Instrument|Generator"
    # ... other settings
)
```

### Key Settings Explained

| Setting | Value | Why |
|---------|-------|-----|
| `IS_SYNTH` | `TRUE` | Makes Ableton treat the plugin as an instrument with MIDI output routing |
| `IS_MIDI_EFFECT` | `FALSE` | VST3 has no MIDI effect concept; TRUE causes host rejection |
| `NEEDS_MIDI_OUTPUT` | `TRUE` | Enables `JucePlugin_ProducesMidiOutput=1` for VST3 MIDI event bus |
| `AU_MAIN_TYPE` | `kAudioUnitType_MIDIProcessor` | Keeps AU as a MIDI effect in Logic regardless of IS_SYNTH |
| `VST3_CATEGORIES` | `"Instrument\|Generator"` | Correct VST3 categorization for hosts |

### Important: IS_SYNTH FALSE Does NOT Work

With `IS_SYNTH FALSE`, Ableton treats the plugin as an audio effect and does not route MIDI output to other tracks. `IS_SYNTH TRUE` is required for cross-track MIDI routing in Ableton Live.

## PluginProcessor Bus Layout

With `IS_MIDI_EFFECT FALSE`, you need a stereo audio output bus (even though the plugin only generates MIDI):

```cpp
GriddyAudioProcessor::GriddyAudioProcessor()
     : AudioProcessor (BusesProperties()
                      .withOutput ("Output", juce::AudioChannelSet::stereo(), true)
                      )
{
}
```

Clear the audio buffer in processBlock since the plugin only produces MIDI:

```cpp
void GriddyAudioProcessor::processBlock (juce::AudioBuffer<float>& buffer,
                                         juce::MidiBuffer& midiMessages)
{
    buffer.clear();  // Silent audio output
    // ... MIDI generation code ...
}
```

The `isBusesLayoutSupported` should accept stereo output:

```cpp
bool GriddyAudioProcessor::isBusesLayoutSupported (const BusesLayout& layouts) const
{
    if (layouts.getMainOutputChannelSet() != juce::AudioChannelSet::stereo())
        return false;
    if (layouts.getMainInputChannelSet() != juce::AudioChannelSet::disabled()
        && layouts.getMainInputChannelSet() != juce::AudioChannelSet::stereo())
        return false;
    return true;
}
```

## Ableton Live Routing (Verified)

1. Track 1: Load the VST3 plugin, set Monitor to "In"
2. Track 2: Load an instrument (e.g., Drum Rack)
3. Track 2 Input Type: "1-PluginName"
4. Track 2 Input Channel: "PluginName"
5. Track 2 Monitor: "In"
6. Press Play

## What This Achieves

- **AU in Logic Pro**: Appears as a MIDI effect (kAudioUnitType_MIDIProcessor), sits before instruments on the same track
- **VST3 in Ableton Live**: Appears as an instrument, MIDI output routes to other tracks
- **VST3 in FL Studio**: MIDI routing via port assignment or Patcher
- **VST3 in Cubase/Bitwig/Reaper**: Standard instrument MIDI routing
- **Standalone**: Works as before with stereo output bus

## Post-Build Script

If using a post-build copy script, make sure it routes plugin types to the correct system directories:

```bash
COMPONENT_NAME=$(basename "${component_path}")
if [[ "$COMPONENT_NAME" == *.component ]]; then
    DEST_DIR="$HOME/Library/Audio/Plug-Ins/Components/"
elif [[ "$COMPONENT_NAME" == *.vst3 ]]; then
    DEST_DIR="$HOME/Library/Audio/Plug-Ins/VST3/"
fi
```

## Learnings

- VST3 has no native MIDI Effect concept. `IS_MIDI_EFFECT TRUE` causes most hosts to reject the VST3.
- `AU_MAIN_TYPE kAudioUnitType_MIDIProcessor` works independently of `IS_MIDI_EFFECT` and `IS_SYNTH` flags — Logic uses the AU type, not the JUCE flags.
- The stereo audio output bus exists only so hosts like Ableton accept the plugin. It outputs silence.
- Ableton requires `IS_SYNTH TRUE` for MIDI output routing — `IS_SYNTH FALSE` with `NEEDS_MIDI_OUTPUT TRUE` is not enough.
- MIDI notes route correctly through VST3 in Ableton Live. MIDI CC output has a known limitation (host-side, not plugin-side).
